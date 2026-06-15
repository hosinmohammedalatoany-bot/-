from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAuthenticatedActive, require_module
from accounts.roles import has_permission
from accounts.services import log_audit

from .models import DailyCashRegister, Expense
from .serializers import (
    CashTransactionSerializer,
    CashTransactionWriteSerializer,
    DailyCashRegisterSerializer,
    DailyCashRegisterWriteSerializer,
    ExpenseSerializer,
    ExpenseWriteSerializer,
)
from .services import compute_financial_summary, compute_vehicle_profit


def _can_delete_expense(user) -> bool:
    if user.role == "admin" or user.is_superuser:
        return True
    return has_permission(user.role, user.extra_permissions, "expense.delete")


class FinancialSummaryView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("accounting")]

    def get(self, request):
        branch = (request.query_params.get("branch") or "").strip() or None
        data = compute_financial_summary(branch_name=branch)
        return Response(data)


class VehicleProfitView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("accounting")]

    def get(self, request, vehicle_id):
        data = compute_vehicle_profit(vehicle_id)
        if data.get("error"):
            return Response({"detail": data["error"]}, status=404)
        return Response(data)


class ExpenseListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("accounting")]

    def get(self, request):
        qs = Expense.objects.filter(is_archived=False).select_related("vehicle", "created_by")
        branch = (request.query_params.get("branch") or "").strip()
        if branch:
            qs = qs.filter(branch_name=branch)
        vehicle_id = request.query_params.get("vehicle_id")
        if vehicle_id:
            qs = qs.filter(vehicle_id=vehicle_id)
        return Response(ExpenseSerializer(qs[:500], many=True).data)

    def post(self, request):
        serializer = ExpenseWriteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        expense = serializer.save()
        log_audit(
            action="expense.create",
            actor=request.user,
            target_id=str(expense.id),
            details=f"مصروف {expense.category} — {expense.amount}",
        )
        return Response(ExpenseSerializer(expense).data, status=status.HTTP_201_CREATED)


class ExpenseDetailView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("accounting")]

    def patch(self, request, expense_id):
        try:
            expense = Expense.objects.get(pk=expense_id, is_archived=False)
        except Expense.DoesNotExist:
            return Response({"detail": "المصروف غير موجود."}, status=404)
        serializer = ExpenseWriteSerializer(
            expense, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        expense = serializer.save()
        log_audit(
            action="expense.update",
            actor=request.user,
            target_id=str(expense.id),
            details=f"تحديث مصروف {expense.category}",
        )
        return Response(ExpenseSerializer(expense).data)

    def delete(self, request, expense_id):
        if not _can_delete_expense(request.user):
            return Response({"detail": "غير مصرح بحذف المصروفات."}, status=403)
        try:
            expense = Expense.objects.get(pk=expense_id, is_archived=False)
        except Expense.DoesNotExist:
            return Response({"detail": "المصروف غير موجود."}, status=404)
        expense.is_archived = True
        expense.save(update_fields=["is_archived", "updated_at"])
        log_audit(
            action="expense.archive",
            actor=request.user,
            target_id=str(expense.id),
            details=f"أرشفة مصروف {expense.category}",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class DailyCashListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("accounting")]

    def get(self, request):
        qs = DailyCashRegister.objects.prefetch_related("transactions").order_by(
            "-business_date"
        )[:60]
        branch = (request.query_params.get("branch") or "").strip()
        if branch:
            qs = qs.filter(branch_name=branch)
        date_param = request.query_params.get("date")
        if date_param:
            qs = qs.filter(business_date=date_param)
        return Response(DailyCashRegisterSerializer(qs, many=True).data)

    def post(self, request):
        serializer = DailyCashRegisterWriteSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        try:
            register = serializer.save()
        except Exception as exc:
            return Response({"detail": str(exc)}, status=400)
        register = DailyCashRegister.objects.prefetch_related("transactions").get(
            pk=register.pk
        )
        log_audit(
            action="cash.register.create",
            actor=request.user,
            target_id=str(register.id),
            details=f"صندوق يومي {register.branch_name} — {register.business_date}",
        )
        return Response(
            DailyCashRegisterSerializer(register).data,
            status=status.HTTP_201_CREATED,
        )


class DailyCashTransactionCreateView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("accounting")]

    def post(self, request, register_id):
        try:
            register = DailyCashRegister.objects.get(pk=register_id)
        except DailyCashRegister.DoesNotExist:
            return Response({"detail": "الصندوق غير موجود."}, status=404)
        serializer = CashTransactionWriteSerializer(
            data=request.data,
            context={"request": request, "register": register},
        )
        serializer.is_valid(raise_exception=True)
        tx = serializer.save()
        log_audit(
            action="cash.transaction",
            actor=request.user,
            target_id=str(tx.id),
            details=f"{tx.direction} {tx.amount} — {tx.category}",
        )
        return Response(CashTransactionSerializer(tx).data, status=status.HTTP_201_CREATED)


class DailyCashCloseView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("accounting")]

    def post(self, request, register_id):
        if not (
            request.user.role in ("admin", "accountant")
            or request.user.is_superuser
            or has_permission(request.user.role, request.user.extra_permissions, "expense.delete")
        ):
            return Response({"detail": "غير مصرح بإغلاق الصندوق."}, status=403)
        try:
            register = DailyCashRegister.objects.get(pk=register_id)
        except DailyCashRegister.DoesNotExist:
            return Response({"detail": "الصندوق غير موجود."}, status=404)
        if register.is_closed:
            return Response({"detail": "الصندوق مغلق مسبقاً."}, status=400)
        register.is_closed = True
        register.closed_at = timezone.now()
        register.save(update_fields=["is_closed", "closed_at", "updated_at"])
        register = DailyCashRegister.objects.prefetch_related("transactions").get(
            pk=register.pk
        )
        log_audit(
            action="cash.register.close",
            actor=request.user,
            target_id=str(register.id),
            details=f"إغلاق صندوق {register.business_date}",
        )
        return Response(DailyCashRegisterSerializer(register).data)
