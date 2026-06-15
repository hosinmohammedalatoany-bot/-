from django.http import HttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAuthenticatedActive, require_module
from accounts.roles import has_permission
from accounts.services import log_audit

from .services import build_report, list_report_catalog, report_to_csv


def _can_export(user, export_format: str) -> bool:
    if user.role == "admin" or user.is_superuser:
        return True
    if export_format == "csv":
        return has_permission(user.role, user.extra_permissions, "export.excel")
    if export_format in ("pdf", "html"):
        return has_permission(user.role, user.extra_permissions, "export.pdf")
    return False


class ReportCatalogView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("reports")]

    def get(self, request):
        return Response({"reports": list_report_catalog()})


class ReportDetailView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("reports")]

    def get(self, request):
        report_type = (request.query_params.get("type") or "").strip()
        if not report_type:
            return Response({"detail": "حدد نوع التقرير عبر type."}, status=400)
        branch = (request.query_params.get("branch") or "").strip() or None
        try:
            data = build_report(report_type, branch_name=branch)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(data)


class ReportExportView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("reports")]

    def get(self, request):
        report_type = (request.query_params.get("type") or "").strip()
        export_format = (
            request.query_params.get("export_format")
            or request.query_params.get("format")
            or "csv"
        ).strip().lower()
        if not report_type:
            return Response({"detail": "حدد نوع التقرير."}, status=400)
        if not _can_export(request.user, export_format):
            return Response({"detail": "غير مصرح بتصدير التقارير."}, status=403)

        branch = (request.query_params.get("branch") or "").strip() or None
        try:
            report = build_report(report_type, branch_name=branch)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)

        log_audit(
            action="report.export",
            actor=request.user,
            target_id=report_type,
            details=f"تصدير {report['title']} — {export_format}",
        )

        if export_format == "csv":
            csv_text = report_to_csv(report)
            filename = f"{report_type}-report.csv"
            response = HttpResponse(csv_text, content_type="text/csv; charset=utf-8")
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response

        if export_format == "json":
            return Response(report)

        return Response(
            {"detail": "صيغة التصدير غير مدعومة. استخدم csv أو json."},
            status=400,
        )
