from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAuthenticatedActive, require_module
from accounts.roles import has_permission

from .models import InstallmentContract, InstallmentPayment, InstallmentScheduleEntry
from .serializers import (
    InstallmentContractCreateSerializer,
    InstallmentContractListSerializer,
    InstallmentPaymentCreateSerializer,
    InstallmentPaymentSerializer,
    ScheduleEntrySerializer,
)
from .services import delete_installment_payment


def _can_adjust_payments(user) -> bool:
    if user.role == "admin" or user.is_superuser:
        return True
    return has_permission(user.role, user.extra_permissions, "installment.adjust")


class ScheduleEntryListView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("installments")]

    def get(self, request):
        qs = InstallmentScheduleEntry.objects.filter(
            contract__is_archived=False
        ).select_related("contract", "contract__customer", "contract__vehicle")
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        if request.query_params.get("overdue") == "1":
            qs = qs.filter(status="overdue")
        customer_id = request.query_params.get("customer_id")
        if customer_id:
            qs = qs.filter(contract__customer_id=customer_id)
        for entry in qs[:500]:
            entry.refresh_status()
        return Response(ScheduleEntrySerializer(qs[:500], many=True).data)


class InstallmentContractListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("installments")]

    def get(self, request):
        qs = InstallmentContract.objects.filter(is_archived=False).select_related(
            "customer", "vehicle", "sale_invoice"
        )
        return Response(InstallmentContractListSerializer(qs[:200], many=True).data)

    def post(self, request):
        serializer = InstallmentContractCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        try:
            contract = serializer.save()
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        contract = InstallmentContract.objects.select_related(
            "customer", "vehicle", "sale_invoice"
        ).get(pk=contract.pk)
        entries = contract.schedule_entries.all()
        return Response(
            {
                "contract": InstallmentContractListSerializer(contract).data,
                "schedule": ScheduleEntrySerializer(entries, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


class InstallmentPaymentListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("installments")]

    def get(self, request):
        entry_id = request.query_params.get("schedule_entry_id")
        qs = InstallmentPayment.objects.select_related("recorded_by", "schedule_entry")
        if entry_id:
            qs = qs.filter(schedule_entry_id=entry_id)
        return Response(InstallmentPaymentSerializer(qs[:200], many=True).data)

    def post(self, request):
        serializer = InstallmentPaymentCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        entry = InstallmentScheduleEntry.objects.select_related("contract").get(
            pk=payment.schedule_entry_id
        )
        return Response(
            {
                "payment": InstallmentPaymentSerializer(payment).data,
                "schedule_entry": ScheduleEntrySerializer(entry).data,
            },
            status=status.HTTP_201_CREATED,
        )


class InstallmentPaymentDetailView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("installments")]

    def delete(self, request, payment_id):
        if not _can_adjust_payments(request.user):
            return Response(
                {"detail": "لا تملك صلاحية تعديل أو حذف دفعات التقسيط."},
                status=403,
            )
        try:
            payment = InstallmentPayment.objects.get(pk=payment_id)
        except InstallmentPayment.DoesNotExist:
            return Response({"detail": "الدفعة غير موجودة."}, status=404)
        try:
            delete_installment_payment(user=request.user, payment=payment)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(status=status.HTTP_204_NO_CONTENT)
