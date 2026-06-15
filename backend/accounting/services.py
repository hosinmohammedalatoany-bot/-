from __future__ import annotations

from decimal import Decimal

from django.db.models import F, Sum
from django.db.models.functions import Coalesce

from sales.models import InvoiceStatus, SaleInvoice
from vehicles.models import Vehicle, VehicleStatus

from .models import CashDirection, CashTransaction, DailyCashRegister, Expense


def _decimal(value) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(value)


def compute_financial_summary(*, branch_name: str | None = None) -> dict:
    invoices = SaleInvoice.objects.filter(
        status=InvoiceStatus.ISSUED,
        is_archived=False,
    )
    expenses_qs = Expense.objects.filter(is_archived=False)
    if branch_name:
        invoices = invoices.filter(vehicle__branch_name=branch_name)
        expenses_qs = expenses_qs.filter(branch_name=branch_name)

    revenue_agg = invoices.aggregate(
        total=Coalesce(
            Sum(F("total") - F("discount") + F("tax")),
            Decimal("0"),
        )
    )
    expense_agg = expenses_qs.aggregate(total=Coalesce(Sum("amount"), Decimal("0")))
    revenue = _decimal(revenue_agg["total"])
    total_expenses = _decimal(expense_agg["total"])
    net_profit = revenue - total_expenses

    sold_vehicles = Vehicle.objects.filter(
        status=VehicleStatus.SOLD,
        is_archived=False,
    )
    if branch_name:
        sold_vehicles = sold_vehicles.filter(branch_name=branch_name)

    vehicle_profits = []
    for vehicle in sold_vehicles[:200]:
        vehicle_profits.append(compute_vehicle_profit(vehicle.id))

    return {
        "revenue": int(revenue),
        "total_expenses": int(total_expenses),
        "net_profit": int(net_profit),
        "invoice_count": invoices.count(),
        "expense_count": expenses_qs.count(),
        "vehicle_profits": vehicle_profits,
    }


def compute_vehicle_profit(vehicle_id) -> dict:
    try:
        vehicle = Vehicle.objects.get(pk=vehicle_id, is_archived=False)
    except Vehicle.DoesNotExist:
        return {"vehicle_id": str(vehicle_id), "error": "السيارة غير موجودة."}

    invoice = (
        SaleInvoice.objects.filter(
            vehicle_id=vehicle_id,
            status=InvoiceStatus.ISSUED,
            is_archived=False,
        )
        .order_by("-created_at")
        .first()
    )
    net_sale = _decimal(invoice.net_total) if invoice else Decimal("0")
    base_cost = (
        _decimal(vehicle.purchase_price)
        + _decimal(vehicle.maintenance_cost)
        + _decimal(vehicle.transportation_cost)
    )
    extra = Expense.objects.filter(vehicle_id=vehicle_id, is_archived=False).aggregate(
        total=Coalesce(Sum("amount"), Decimal("0"))
    )
    extra_expenses = _decimal(extra["total"])
    total_cost = base_cost + extra_expenses
    profit = net_sale - total_cost

    return {
        "vehicle_id": str(vehicle.id),
        "internal_number": vehicle.internal_number,
        "vin": vehicle.vin,
        "manufacturer": vehicle.manufacturer,
        "model": vehicle.model,
        "branch_name": vehicle.branch_name or "",
        "status": vehicle.status,
        "net_sale": int(net_sale),
        "purchase_price": int(vehicle.purchase_price),
        "maintenance_cost": int(vehicle.maintenance_cost),
        "transportation_cost": int(vehicle.transportation_cost),
        "linked_expenses": int(extra_expenses),
        "total_cost": int(total_cost),
        "profit": int(profit),
        "invoice_id": str(invoice.id) if invoice else None,
        "document_number": invoice.document_number if invoice else None,
    }


def register_cash_totals(register: DailyCashRegister) -> dict:
    agg = register.transactions.aggregate(
        cash_in=Coalesce(
            Sum("amount", filter=F("direction") == CashDirection.IN),
            Decimal("0"),
        ),
        cash_out=Coalesce(
            Sum("amount", filter=F("direction") == CashDirection.OUT),
            Decimal("0"),
        ),
    )
    cash_in = _decimal(agg["cash_in"])
    cash_out = _decimal(agg["cash_out"])
    opening = _decimal(register.opening_balance)
    expected_close = opening + cash_in - cash_out
    return {
        "cash_in": int(cash_in),
        "cash_out": int(cash_out),
        "expected_closing": int(expected_close),
    }
