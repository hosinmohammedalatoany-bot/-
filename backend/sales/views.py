from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAuthenticatedActive, require_module

from accounts.roles import has_module_access, has_permission

from .models import InvoiceRevisionLog, InvoiceStatus, PrintLog, Reservation, SaleInvoice
from .serializers import (
    PrintLogCreateSerializer,
    PrintLogSerializer,
    ReservationCreateSerializer,
    ReservationListSerializer,
    SaleInvoiceCreateSerializer,
    SaleInvoiceListSerializer,
)
from .services import archive_sale_invoice, cancel_reservation


def _user_can_print(user, document_type: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.role == "admin" or user.is_superuser:
        return True
    perm_map = {
        "invoice": "print.invoices",
        "contract": "print.contracts",
        "receipt": "print.invoices",
        "report": "print.reports",
    }
    code = perm_map.get(document_type)
    if not code:
        return False
    return has_permission(user.role, user.extra_permissions, code)


def _user_can_view_print_logs(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.role == "admin" or user.is_superuser:
        return True
    for code in ("print.invoices", "print.contracts", "print.reports"):
        if has_permission(user.role, user.extra_permissions, code):
            return True
    return False


class InvoicePublicVerifyView(APIView):
    """Public invoice verification for QR codes (no auth)."""

    authentication_classes = []
    permission_classes = []

    def get(self, request, document_number: str):
        number = document_number.strip()
        try:
            invoice = SaleInvoice.objects.select_related("vehicle", "customer").get(
                document_number__iexact=number
            )
        except SaleInvoice.DoesNotExist:
            return Response({"detail": "الفاتورة غير موجودة.", "valid": False}, status=404)

        valid = (
            not invoice.is_archived
            and invoice.status in (InvoiceStatus.ISSUED, InvoiceStatus.REVISED)
        )
        customer = invoice.customer
        customer_display = customer.name.split()[0] if customer.name else "—"
        vehicle = invoice.vehicle
        return Response(
            {
                "valid": valid,
                "document_number": invoice.document_number,
                "status": invoice.status,
                "issued_at": invoice.created_at.isoformat(),
                "net_total": str(invoice.net_total),
                "payment_type": invoice.payment_type,
                "vehicle_label": f"{vehicle.manufacturer} {vehicle.model} ({vehicle.internal_number})",
                "customer_name": customer_display,
                "branch": vehicle.branch_name or "",
            }
        )


class PrintLogListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive]

    def get(self, request):
        if not _user_can_view_print_logs(request.user):
            return Response({"detail": "غير مصرح."}, status=403)
        limit = min(int(request.query_params.get("limit", 200)), 500)
        qs = PrintLog.objects.select_related("actor").all()[:limit]
        return Response(PrintLogSerializer(qs, many=True).data)

    def post(self, request):
        doc_type = request.data.get("document_type", "")
        if not _user_can_print(request.user, str(doc_type)):
            return Response({"detail": "غير مصرح بالطباعة."}, status=403)
        serializer = PrintLogCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()
        return Response(
            PrintLogSerializer(entry).data,
            status=status.HTTP_201_CREATED,
        )


class ReservationListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("reservations")]

    def get(self, request):
        qs = Reservation.objects.filter(is_archived=False).select_related(
            "vehicle", "customer"
        )
        if request.query_params.get("active") == "1":
            qs = [r for r in qs if r.is_active]
        else:
            qs = list(qs)
        return Response(ReservationListSerializer(qs, many=True).data)

    def post(self, request):
        serializer = ReservationCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        reservation = serializer.save()
        return Response(
            ReservationListSerializer(reservation).data,
            status=status.HTTP_201_CREATED,
        )


class ReservationDetailView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("reservations")]

    def delete(self, request, reservation_id):
        try:
            reservation = Reservation.objects.get(pk=reservation_id, is_archived=False)
        except Reservation.DoesNotExist:
            return Response({"detail": "الحجز غير موجود."}, status=404)
        try:
            cancel_reservation(user=request.user, reservation=reservation)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SaleInvoiceListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("sales")]

    def get(self, request):
        qs = SaleInvoice.objects.filter(is_archived=False).select_related(
            "vehicle", "customer"
        )
        return Response(SaleInvoiceListSerializer(qs[:500], many=True).data)

    def post(self, request):
        serializer = SaleInvoiceCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()
        return Response(
            SaleInvoiceListSerializer(invoice).data,
            status=status.HTTP_201_CREATED,
        )


def _user_can_view_invoice_revisions(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.role == "admin" or user.is_superuser:
        return True
    if has_permission(user.role, user.extra_permissions, "audit.view"):
        return True
    return has_module_access(user.role, user.extra_permissions, "sales")


class InvoiceRevisionListView(APIView):
    permission_classes = [IsAuthenticatedActive]

    def get(self, request, invoice_id):
        if not _user_can_view_invoice_revisions(request.user):
            return Response({"detail": "غير مصرح."}, status=403)
        try:
            invoice = SaleInvoice.objects.get(pk=invoice_id)
        except SaleInvoice.DoesNotExist:
            return Response({"detail": "الفاتورة غير موجودة."}, status=404)
        rows = InvoiceRevisionLog.objects.filter(invoice=invoice).select_related("actor")[
            :100
        ]
        return Response(
            {
                "invoice_id": str(invoice.id),
                "document_number": invoice.document_number,
                "revisions": [
                    {
                        "id": str(r.id),
                        "revision_type": r.revision_type,
                        "actor_name": r.actor.full_display_name if r.actor else "",
                        "actor_email": r.actor.email if r.actor else "",
                        "snapshot": r.snapshot,
                        "note": r.note,
                        "created_at": r.created_at.isoformat(),
                    }
                    for r in rows
                ],
            }
        )


class SaleInvoiceDetailView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("sales")]

    def delete(self, request, invoice_id):
        try:
            invoice = SaleInvoice.objects.get(pk=invoice_id, is_archived=False)
        except SaleInvoice.DoesNotExist:
            return Response({"detail": "الفاتورة غير موجودة."}, status=404)
        try:
            archive_sale_invoice(user=request.user, invoice=invoice)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(status=status.HTTP_204_NO_CONTENT)
