from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsAuthenticatedActive
from accounts.models import AuditLog

from .models import BackupRecord, ClientSyncLog, SystemErrorLog
from .services import (
    collect_health_status,
    create_backup,
    log_system_error,
    maybe_run_auto_backup,
    record_client_sync,
    restore_backup_from_file,
)


def _backup_to_dict(row: BackupRecord) -> dict:
    return {
        "id": str(row.id),
        "kind": row.kind,
        "status": row.status,
        "file_name": row.file_name,
        "file_path": row.file_path,
        "byte_size": row.byte_size,
        "entity_counts": row.entity_counts,
        "error_message": row.error_message,
        "created_by_email": row.created_by.email if row.created_by else "",
        "created_at": row.created_at.isoformat(),
        "completed_at": row.completed_at.isoformat() if row.completed_at else None,
    }


class OpsHealthView(APIView):
    permission_classes = [IsAuthenticatedActive]

    def get(self, request):
        maybe_run_auto_backup(user=request.user)
        payload = collect_health_status()
        payload["api"] = "ok"
        return Response(payload)


class BackupListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive, IsAdmin]

    def get(self, request):
        limit = min(int(request.query_params.get("limit", 50)), 100)
        rows = BackupRecord.objects.select_related("created_by").order_by("-created_at")[
            :limit
        ]
        return Response({"backups": [_backup_to_dict(r) for r in rows]})

    def post(self, request):
        kind = request.data.get("kind") or BackupRecord.KIND_MANUAL
        if kind not in (BackupRecord.KIND_MANUAL, BackupRecord.KIND_AUTO):
            kind = BackupRecord.KIND_MANUAL
        record = create_backup(kind=kind, user=request.user)
        AuditLog.objects.create(
            action="backup.create",
            actor=request.user,
            actor_email=request.user.email,
            target_id=str(record.id),
            details=f"{kind} {record.status} {record.file_name}",
        )
        code = status.HTTP_201_CREATED if record.status == BackupRecord.STATUS_SUCCESS else 500
        return Response(_backup_to_dict(record), status=code)


class BackupDownloadView(APIView):
    permission_classes = [IsAuthenticatedActive, IsAdmin]

    def get(self, request, backup_id):
        try:
            record = BackupRecord.objects.get(pk=backup_id)
        except BackupRecord.DoesNotExist:
            raise Http404 from None
        if record.status != BackupRecord.STATUS_SUCCESS or not record.file_path:
            return Response({"detail": "النسخة غير جاهزة للتنزيل."}, status=400)
        path = Path(settings.MEDIA_ROOT) / record.file_path
        if not path.is_file():
            return Response({"detail": "ملف النسخة غير موجود على الخادم."}, status=404)
        return FileResponse(
            path.open("rb"),
            as_attachment=True,
            filename=record.file_name or "backup.json",
            content_type="application/json",
        )


class BackupRestoreView(APIView):
    permission_classes = [IsAuthenticatedActive, IsAdmin]

    def post(self, request, backup_id):
        confirm = request.data.get("confirm") is True
        if not confirm:
            return Response(
                {"detail": "أرسل confirm: true لتأكيد الاستعادة."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            record = BackupRecord.objects.get(pk=backup_id)
        except BackupRecord.DoesNotExist:
            raise Http404 from None
        if record.status != BackupRecord.STATUS_SUCCESS or not record.file_path:
            return Response({"detail": "لا يمكن الاستعادة من هذه النسخة."}, status=400)
        path = Path(settings.MEDIA_ROOT) / record.file_path
        if not path.is_file():
            return Response({"detail": "ملف النسخة غير موجود."}, status=404)
        try:
            result = restore_backup_from_file(path, user=request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        except Exception as exc:  # noqa: BLE001
            log_system_error(
                level=SystemErrorLog.LEVEL_CRITICAL,
                source="restore",
                message=str(exc),
                user_email=request.user.email,
            )
            return Response({"detail": "فشلت الاستعادة."}, status=500)
        return Response({"ok": True, **result})


class SystemErrorLogListView(APIView):
    permission_classes = [IsAuthenticatedActive, IsAdmin]

    def get(self, request):
        limit = min(int(request.query_params.get("limit", 100)), 300)
        level = (request.query_params.get("level") or "").strip()
        qs = SystemErrorLog.objects.all()
        if level:
            qs = qs.filter(level=level)
        rows = qs.order_by("-created_at")[:limit]
        return Response(
            {
                "logs": [
                    {
                        "id": str(r.id),
                        "level": r.level,
                        "source": r.source,
                        "message": r.message,
                        "details": r.details,
                        "request_path": r.request_path,
                        "user_email": r.user_email,
                        "created_at": r.created_at.isoformat(),
                    }
                    for r in rows
                ]
            }
        )


class ClientSyncLogListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive]

    def get(self, request):
        if request.user.role != "admin" and not request.user.is_superuser:
            qs = ClientSyncLog.objects.filter(user=request.user)
        else:
            qs = ClientSyncLog.objects.all()
        limit = min(int(request.query_params.get("limit", 100)), 300)
        rows = qs.select_related("user").order_by("-created_at")[:limit]
        return Response(
            {
                "logs": [
                    {
                        "id": str(r.id),
                        "device_id": r.device_id,
                        "status": r.status,
                        "accepted_count": r.accepted_count,
                        "duplicate_count": r.duplicate_count,
                        "failed_count": r.failed_count,
                        "remaining_count": r.remaining_count,
                        "message": r.message,
                        "user_email": r.user.email if r.user else "",
                        "created_at": r.created_at.isoformat(),
                    }
                    for r in rows
                ]
            }
        )

    def post(self, request):
        data = request.data
        status_val = data.get("status") or ClientSyncLog.STATUS_SUCCESS
        if status_val not in dict(ClientSyncLog.STATUS_CHOICES):
            status_val = ClientSyncLog.STATUS_SUCCESS
        row = record_client_sync(
            user=request.user,
            device_id=str(data.get("device_id") or ""),
            status=status_val,
            accepted=int(data.get("accepted") or data.get("accepted_count") or 0),
            duplicates=int(data.get("duplicates") or data.get("duplicate_count") or 0),
            failed=int(data.get("failed") or data.get("failed_count") or 0),
            remaining=int(data.get("remaining") or data.get("remaining_count") or 0),
            message=str(data.get("message") or ""),
            payload_summary=data.get("payload_summary") if isinstance(data.get("payload_summary"), dict) else {},
        )
        return Response(
            {
                "id": str(row.id),
                "created_at": row.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )
