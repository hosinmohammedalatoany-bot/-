from __future__ import annotations

import json
import os
from datetime import timedelta
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.core.serializers import deserialize, serialize
from django.db import transaction
from django.utils import timezone

from accounts.models import AuditLog

from .models import BackupRecord, ClientSyncLog, SystemErrorLog

BACKUP_VERSION = 2
BACKUP_SUBDIR = "backups"

# Business data only — never export user passwords or session tokens.
EXPORT_LABELS = [
    ("accounts", "branch"),
    ("organization", "companyprofile"),
    ("organization", "branchprintoverride"),
    ("vehicles", "vehicle"),
    ("vehicles", "vehicleimage"),
    ("vehicles", "vehicledocument"),
    ("customers", "customer"),
    ("customers", "lead"),
    ("customers", "leadnote"),
    ("sales", "reservation"),
    ("sales", "saleinvoice"),
    ("sales", "printlog"),
    ("installments", "installmentcontract"),
    ("installments", "installmentscheduleentry"),
    ("installments", "installmentpayment"),
    ("accounting", "expense"),
    ("accounting", "dailycashregister"),
    ("accounting", "cashtransaction"),
]


def backups_dir() -> Path:
    root = Path(settings.MEDIA_ROOT) / BACKUP_SUBDIR
    root.mkdir(parents=True, exist_ok=True)
    return root


def log_system_error(
    *,
    level: str,
    source: str,
    message: str,
    details: dict | None = None,
    request_path: str = "",
    user_email: str = "",
) -> SystemErrorLog:
    return SystemErrorLog.objects.create(
        level=level,
        source=source,
        message=message[:4000],
        details=details or {},
        request_path=request_path[:512],
        user_email=user_email[:254],
    )


def _queryset_for_label(app_label: str, model_name: str):
    model = apps.get_model(app_label, model_name)
    qs = model.objects.all()
    if hasattr(model, "is_archived"):
        return qs
    return qs


def export_showroom_snapshot() -> dict:
    chunks: list[dict] = []
    counts: dict[str, int] = {}
    for app_label, model_name in EXPORT_LABELS:
        qs = _queryset_for_label(app_label, model_name)
        label = f"{app_label}.{model_name}"
        raw = serialize("json", qs)
        items = json.loads(raw)
        chunks.append({"label": label, "items": items})
        counts[label] = len(items)
    return {
        "version": BACKUP_VERSION,
        "exported_at": timezone.now().isoformat(),
        "service": "baraa-raed",
        "chunks": chunks,
        "counts": counts,
    }


def create_backup(*, kind: str, user=None) -> BackupRecord:
    record = BackupRecord.objects.create(
        kind=kind, status=BackupRecord.STATUS_PENDING, created_by=user
    )
    try:
        payload = export_showroom_snapshot()
        stamp = timezone.now().strftime("%Y%m%d-%H%M%S")
        file_name = f"baraa-raed-{kind}-{stamp}.json"
        path = backups_dir() / file_name
        raw = json.dumps(payload, ensure_ascii=False, indent=2)
        path.write_text(raw, encoding="utf-8")
        record.file_name = file_name
        record.file_path = str(path.relative_to(settings.MEDIA_ROOT))
        record.byte_size = path.stat().st_size
        record.entity_counts = payload.get("counts", {})
        record.status = BackupRecord.STATUS_SUCCESS
        record.completed_at = timezone.now()
        record.save(
            update_fields=[
                "file_name",
                "file_path",
                "byte_size",
                "entity_counts",
                "status",
                "completed_at",
            ]
        )
    except Exception as exc:  # noqa: BLE001
        record.status = BackupRecord.STATUS_FAILED
        record.error_message = str(exc)[:2000]
        record.completed_at = timezone.now()
        record.save(update_fields=["status", "error_message", "completed_at"])
        log_system_error(
            level=SystemErrorLog.LEVEL_CRITICAL,
            source="backup",
            message=f"Backup failed: {exc}",
            details={"backup_id": str(record.id), "kind": kind},
            user_email=getattr(user, "email", "") if user else "",
        )
    return record


def restore_backup_from_file(path: Path, *, user=None) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    version = data.get("version")
    if version not in (BACKUP_VERSION, 1):
        raise ValueError("إصدار ملف النسخة الاحتياطية غير مدعوم.")

    stats: dict[str, int] = {}

    with transaction.atomic():
        if version == BACKUP_VERSION:
            chunks = data.get("chunks", [])
        else:
            # Legacy v1 flat dict — not supported for restore after refactor
            raise ValueError("استخدم نسخة احتياطية من الإصدار الحالي للنظام.")

        for chunk in chunks:
            label = chunk.get("label", "")
            items = chunk.get("items", [])
            for obj in deserialize("json", json.dumps(items)):
                obj.save()
            stats[label] = len(items)

    AuditLog.objects.create(
        action="backup.restore",
        actor=user,
        actor_email=getattr(user, "email", "") if user else "",
        details=f"Restored from {path.name}: {stats}",
    )
    return {"restored": stats, "exported_at": data.get("exported_at")}


def collect_health_status() -> dict:
    from django.db import connection

    db_ok = False
    db_error = None
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_ok = True
    except Exception as exc:  # noqa: BLE001
        db_error = str(exc)

    media_root = Path(settings.MEDIA_ROOT)
    media_writable = False
    media_error = None
    try:
        media_root.mkdir(parents=True, exist_ok=True)
        probe = media_root / ".health_probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        media_writable = True
    except OSError as exc:
        media_error = str(exc)

    last_backup = BackupRecord.objects.filter(status=BackupRecord.STATUS_SUCCESS).first()
    last_failed = BackupRecord.objects.filter(status=BackupRecord.STATUS_FAILED).first()
    recent_errors = SystemErrorLog.objects.filter(
        level__in=(SystemErrorLog.LEVEL_ERROR, SystemErrorLog.LEVEL_CRITICAL),
        created_at__gte=timezone.now() - timedelta(hours=24),
    ).count()

    auto_hours = int(os.environ.get("OPS_AUTO_BACKUP_HOURS", "24") or "24")
    backup_stale = True
    if last_backup and last_backup.completed_at:
        backup_stale = last_backup.completed_at < timezone.now() - timedelta(
            hours=auto_hours
        )

    alerts = []
    if not db_ok:
        alerts.append({"level": "critical", "message": "قاعدة البيانات غير متصلة."})
    if not media_writable:
        alerts.append(
            {
                "level": "warning",
                "message": media_error or "مجلد الوسائط غير قابل للكتابة.",
            }
        )
    if last_failed and (
        not last_backup
        or (
            last_failed.completed_at
            and last_backup.completed_at
            and last_failed.completed_at > last_backup.completed_at
        )
    ):
        alerts.append(
            {
                "level": "critical",
                "message": f"آخر نسخة احتياطية فشلت: {(last_failed.error_message or '')[:120]}",
            }
        )
    if backup_stale and os.environ.get("OPS_AUTO_BACKUP_ENABLED", "true").lower() in (
        "1",
        "true",
        "yes",
    ):
        alerts.append(
            {
                "level": "warning",
                "message": f"لا توجد نسخة احتياطية ناجحة خلال آخر {auto_hours} ساعة.",
            }
        )
    if recent_errors > 0:
        alerts.append(
            {
                "level": "warning",
                "message": f"{recent_errors} خطأ نظام خلال 24 ساعة.",
            }
        )

    overall = "healthy"
    if any(a["level"] == "critical" for a in alerts):
        overall = "critical"
    elif alerts or not db_ok:
        overall = "degraded"

    return {
        "status": overall,
        "database": {"ok": db_ok, "error": db_error},
        "media": {"writable": media_writable, "root": str(media_root), "error": media_error},
        "backup": {
            "last_success_at": last_backup.completed_at.isoformat()
            if last_backup and last_backup.completed_at
            else None,
            "last_success_file": last_backup.file_name if last_backup else None,
            "last_failed_at": last_failed.completed_at.isoformat()
            if last_failed and last_failed.completed_at
            else None,
            "stale": backup_stale,
            "auto_backup_hours": auto_hours,
        },
        "errors_last_24h": recent_errors,
        "alerts": alerts,
    }


def maybe_run_auto_backup(user=None) -> BackupRecord | None:
    if os.environ.get("OPS_AUTO_BACKUP_ENABLED", "true").lower() not in (
        "1",
        "true",
        "yes",
    ):
        return None
    hours = int(os.environ.get("OPS_AUTO_BACKUP_HOURS", "24") or "24")
    last = (
        BackupRecord.objects.filter(
            kind=BackupRecord.KIND_AUTO, status=BackupRecord.STATUS_SUCCESS
        )
        .order_by("-completed_at")
        .first()
    )
    if last and last.completed_at and last.completed_at > timezone.now() - timedelta(
        hours=hours
    ):
        return None
    return create_backup(kind=BackupRecord.KIND_AUTO, user=user)


def record_client_sync(
    *,
    user,
    device_id: str,
    status: str,
    accepted: int,
    duplicates: int,
    failed: int,
    remaining: int,
    message: str = "",
    payload_summary: dict | None = None,
) -> ClientSyncLog:
    return ClientSyncLog.objects.create(
        user=user,
        device_id=device_id[:120],
        status=status,
        accepted_count=accepted,
        duplicate_count=duplicates,
        failed_count=failed,
        remaining_count=remaining,
        message=message[:2000],
        payload_summary=payload_summary or {},
    )
