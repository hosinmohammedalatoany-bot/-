from __future__ import annotations

from decimal import Decimal

from django.db.models import Count, F, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from accounting.services import compute_financial_summary
from customers.models import Customer, Lead
from installments.models import InstallmentScheduleEntry, ScheduleStatus
from sales.models import InvoiceStatus, SaleInvoice
from vehicles.models import Vehicle, VehicleStatus


def _branch_filter(qs, branch_name: str | None, field: str = "branch_name"):
    if branch_name:
        return qs.filter(**{field: branch_name})
    return qs


def _row(*cells) -> list:
    return [str(c) if c is not None else "" for c in cells]


def build_report(report_type: str, *, branch_name: str | None = None) -> dict:
    builders = {
        "sales": _report_sales,
        "profit": _report_profit,
        "inventory": _report_inventory,
        "sold": _report_sold,
        "reserved": _report_reserved,
        "installments": _report_installments_overdue,
        "customers": _report_customers,
        "branches": _report_branches,
        "employees": _report_employees,
    }
    builder = builders.get(report_type)
    if not builder:
        raise ValueError(f"نوع التقرير غير معروف: {report_type}")
    return builder(branch_name=branch_name)


def list_report_catalog() -> list[dict]:
    return [
        {"id": "sales", "title": "تقرير المبيعات"},
        {"id": "profit", "title": "الأرباح والخسائر"},
        {"id": "inventory", "title": "تقرير السيارات المتوفرة"},
        {"id": "sold", "title": "تقرير السيارات المباعة"},
        {"id": "reserved", "title": "تقرير الحجوزات"},
        {"id": "installments", "title": "تقرير الأقساط المتأخرة"},
        {"id": "customers", "title": "تقرير العملاء"},
        {"id": "branches", "title": "تقرير الفروع"},
        {"id": "employees", "title": "تقرير أداء الموظفين"},
    ]


def _report_sales(*, branch_name: str | None) -> dict:
    qs = SaleInvoice.objects.filter(
        status=InvoiceStatus.ISSUED,
        is_archived=False,
    ).select_related("vehicle", "customer")
    if branch_name:
        qs = qs.filter(vehicle__branch_name=branch_name)
    headers = ["رقم الفاتورة", "العميل", "المركبة", "الإجمالي", "الخصم", "الضريبة", "الصافي", "التاريخ"]
    rows = []
    for inv in qs.order_by("-created_at")[:1000]:
        vehicle_label = ""
        if inv.vehicle_id:
            vehicle_label = f"{inv.vehicle.manufacturer} {inv.vehicle.model}"
        net = int(inv.net_total)
        rows.append(
            _row(
                inv.document_number,
                inv.customer.name if inv.customer_id else "",
                vehicle_label,
                int(inv.total),
                int(inv.discount),
                int(inv.tax),
                net,
                inv.created_at.isoformat() if inv.created_at else "",
            )
        )
    return {
        "id": "sales",
        "title": "تقرير المبيعات",
        "headers": headers,
        "rows": rows,
        "row_count": len(rows),
    }


def _report_profit(*, branch_name: str | None) -> dict:
    summary = compute_financial_summary(branch_name=branch_name)
    headers = ["البند", "القيمة (د.ع)"]
    rows = [
        _row("إجمالي الإيرادات", summary["revenue"]),
        _row("إجمالي المصروفات", summary["total_expenses"]),
        _row("صافي الربح", summary["net_profit"]),
        _row("عدد الفواتير", summary["invoice_count"]),
        _row("عدد المصروفات", summary["expense_count"]),
    ]
    return {
        "id": "profit",
        "title": "الأرباح والخسائر",
        "headers": headers,
        "rows": rows,
        "row_count": len(rows),
        "summary": summary,
    }


def _report_inventory(*, branch_name: str | None) -> dict:
    qs = Vehicle.objects.filter(status=VehicleStatus.AVAILABLE, is_archived=False)
    qs = _branch_filter(qs, branch_name)
    headers = ["الرقم الداخلي", "المركبة", "VIN", "الفرع", "سعر البيع"]
    rows = []
    for v in qs.order_by("internal_number")[:1000]:
        rows.append(
            _row(
                v.internal_number,
                f"{v.manufacturer} {v.model}",
                v.vin,
                v.branch_name or "",
                int(v.sale_price),
            )
        )
    return {
        "id": "inventory",
        "title": "تقرير السيارات المتوفرة",
        "headers": headers,
        "rows": rows,
        "row_count": len(rows),
    }


def _report_sold(*, branch_name: str | None) -> dict:
    qs = Vehicle.objects.filter(status=VehicleStatus.SOLD, is_archived=False)
    qs = _branch_filter(qs, branch_name)
    headers = ["الرقم الداخلي", "المركبة", "VIN", "الفرع", "تاريخ الإضافة"]
    rows = []
    for v in qs.order_by("-updated_at")[:1000]:
        rows.append(
            _row(
                v.internal_number,
                f"{v.manufacturer} {v.model}",
                v.vin,
                v.branch_name or "",
                v.updated_at.isoformat() if v.updated_at else "",
            )
        )
    return {
        "id": "sold",
        "title": "تقرير السيارات المباعة",
        "headers": headers,
        "rows": rows,
        "row_count": len(rows),
    }


def _report_reserved(*, branch_name: str | None) -> dict:
    qs = Vehicle.objects.filter(status=VehicleStatus.RESERVED, is_archived=False)
    qs = _branch_filter(qs, branch_name)
    headers = ["الرقم الداخلي", "المركبة", "الفرع", "VIN"]
    rows = []
    for v in qs.order_by("internal_number")[:1000]:
        rows.append(
            _row(
                v.internal_number,
                f"{v.manufacturer} {v.model}",
                v.branch_name or "",
                v.vin,
            )
        )
    return {
        "id": "reserved",
        "title": "تقرير الحجوزات",
        "headers": headers,
        "rows": rows,
        "row_count": len(rows),
    }


def _report_installments_overdue(*, branch_name: str | None) -> dict:
    today = timezone.localdate()
    qs = (
        InstallmentScheduleEntry.objects.filter(
            contract__is_archived=False,
            contract__status="active",
        )
        .select_related("contract", "contract__customer")
        .order_by("due_date")
    )
    if branch_name:
        qs = qs.filter(contract__branch_name=branch_name)
    overdue_qs = qs.filter(
        Q(status=ScheduleStatus.OVERDUE)
        | Q(due_date__lt=today, paid_amount__lt=F("amount"))
    ).exclude(status=ScheduleStatus.PAID)
    headers = [
        "العقد",
        "القسط",
        "العميل",
        "المبلغ",
        "المدفوع",
        "المتبقي",
        "الاستحقاق",
        "الحالة",
    ]
    rows = []
    for entry in overdue_qs[:1000]:
        contract = entry.contract
        remaining = int(entry.remaining())
        rows.append(
            _row(
                contract.contract_number,
                entry.sequence,
                contract.customer.name if contract.customer_id else "",
                int(entry.amount),
                int(entry.paid_amount),
                remaining,
                entry.due_date.isoformat(),
                entry.status,
            )
        )
    return {
        "id": "installments",
        "title": "تقرير الأقساط المتأخرة",
        "headers": headers,
        "rows": rows,
        "row_count": len(rows),
    }


def _report_customers(*, branch_name: str | None) -> dict:
    qs = Customer.objects.filter(is_archived=False)
    qs = _branch_filter(qs, branch_name, "branch_name")
    headers = ["الاسم", "الهاتف", "البريد", "المشتريات", "الرصيد", "الفرع"]
    rows = []
    for c in qs.order_by("name")[:1000]:
        rows.append(
            _row(
                c.name,
                c.phone,
                c.email,
                c.purchases,
                int(c.balance),
                c.branch_name or "",
            )
        )
    return {
        "id": "customers",
        "title": "تقرير العملاء",
        "headers": headers,
        "rows": rows,
        "row_count": len(rows),
    }


def _report_branches(*, branch_name: str | None) -> dict:
    vehicle_qs = Vehicle.objects.filter(is_archived=False)
    invoice_qs = SaleInvoice.objects.filter(
        status=InvoiceStatus.ISSUED,
        is_archived=False,
    )
    if branch_name:
        vehicle_qs = vehicle_qs.filter(branch_name=branch_name)
        invoice_qs = invoice_qs.filter(vehicle__branch_name=branch_name)

    branch_names: set[str] = set()
    branch_names.update(
        vehicle_qs.exclude(branch_name="").values_list("branch_name", flat=True)
    )
    branch_names.update(
        invoice_qs.values_list("vehicle__branch_name", flat=True)
    )
    branch_names.discard("")

    headers = [
        "الفرع",
        "متوفرة",
        "محجوزة",
        "مباعة",
        "فواتير",
        "إجمالي المبيعات",
    ]
    rows = []
    for name in sorted(branch_names):
        avail = vehicle_qs.filter(
            branch_name=name, status=VehicleStatus.AVAILABLE
        ).count()
        reserved = vehicle_qs.filter(
            branch_name=name, status=VehicleStatus.RESERVED
        ).count()
        sold = vehicle_qs.filter(branch_name=name, status=VehicleStatus.SOLD).count()
        inv_branch = invoice_qs.filter(vehicle__branch_name=name)
        inv_count = inv_branch.count()
        revenue = inv_branch.aggregate(
            total=Coalesce(
                Sum(F("total") - F("discount") + F("tax")),
                Decimal("0"),
            )
        )["total"]
        rows.append(
            _row(name, avail, reserved, sold, inv_count, int(revenue or 0))
        )

    return {
        "id": "branches",
        "title": "تقرير الفروع",
        "headers": headers,
        "rows": rows,
        "row_count": len(rows),
    }


def _report_employees(*, branch_name: str | None) -> dict:
    qs = (
        SaleInvoice.objects.filter(
            status=InvoiceStatus.ISSUED,
            is_archived=False,
            created_by__isnull=False,
        )
        .values(
            "created_by__email",
            "created_by__first_name",
            "created_by__last_name",
        )
        .annotate(
            sales_count=Count("id"),
            revenue=Coalesce(
                Sum(F("total") - F("discount") + F("tax")),
                Decimal("0"),
            ),
        )
        .order_by("-sales_count")
    )
    if branch_name:
        qs = qs.filter(vehicle__branch_name=branch_name)

    headers = ["الموظف", "البريد", "عدد المبيعات", "إجمالي المبيعات (د.ع)"]
    rows = []
    for row in qs[:200]:
        name = f"{row.get('created_by__first_name') or ''} {row.get('created_by__last_name') or ''}".strip()
        if not name:
            name = row.get("created_by__email") or "—"
        rows.append(
            _row(
                name,
                row.get("created_by__email") or "",
                row.get("sales_count") or 0,
                int(row.get("revenue") or 0),
            )
        )

    lead_qs = Lead.objects.filter(is_archived=False).exclude(assigned_to="")
    if branch_name:
        lead_qs = lead_qs.filter(branch_name=branch_name)
    lead_rows = lead_qs.values("assigned_to").annotate(cnt=Count("id")).order_by(
        "-cnt"
    )[:50]

    return {
        "id": "employees",
        "title": "تقرير أداء الموظفين",
        "headers": headers,
        "rows": rows,
        "row_count": len(rows),
        "lead_assignments": [
            {"name": r["assigned_to"], "leads": r["cnt"]} for r in lead_rows
        ],
    }


def report_to_csv(report: dict) -> str:
    import csv
    import io

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(report.get("headers", []))
    for row in report.get("rows", []):
        writer.writerow(row)
    return buffer.getvalue()
