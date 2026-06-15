from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, F, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from accounting.services import compute_financial_summary
from accounts.models import AuditLog, ShowroomUser
from customers.models import Customer, CustomerNote, Lead, LeadNote
from installments.models import InstallmentScheduleEntry, ScheduleStatus
from ops.models import BackupRecord, SystemErrorLog
from sales.models import InvoiceStatus, Reservation, ReservationStatus, SaleInvoice
from vehicles.models import Vehicle, VehicleDocument, VehicleStatus


def resolve_branch_scope(user: ShowroomUser, branch_name: str | None) -> str | None:
    """Non-admin users are limited to their branch."""
    if user.role == "admin" or user.is_superuser:
        return (branch_name or "").strip() or None
    if user.branch_id:
        return user.branch.name
    return (branch_name or "").strip() or None


def _vehicle_qs(branch_name: str | None):
    qs = Vehicle.objects.filter(is_archived=False)
    if branch_name:
        qs = qs.filter(branch_name=branch_name)
    return qs


def compute_dashboard_metrics(*, branch_name: str | None = None) -> dict:
    vehicles = _vehicle_qs(branch_name)
    available = vehicles.filter(status=VehicleStatus.AVAILABLE).count()
    sold = vehicles.filter(status=VehicleStatus.SOLD).count()
    reserved = vehicles.filter(status=VehicleStatus.RESERVED).count()
    maintenance = vehicles.filter(status=VehicleStatus.MAINTENANCE).count()

    customer_qs = Customer.objects.filter(is_archived=False)
    lead_qs = Lead.objects.filter(is_archived=False)
    if branch_name:
        customer_qs = customer_qs.filter(branch_name=branch_name)
        lead_qs = lead_qs.filter(branch_name=branch_name)

    invoice_qs = SaleInvoice.objects.filter(
        status=InvoiceStatus.ISSUED,
        is_archived=False,
    )
    if branch_name:
        invoice_qs = invoice_qs.filter(vehicle__branch_name=branch_name)

    revenue = invoice_qs.aggregate(
        total=Coalesce(
            Sum(F("total") - F("discount") + F("tax")),
            Decimal("0"),
        )
    )["total"]

    inventory_value = vehicles.filter(status=VehicleStatus.AVAILABLE).aggregate(
        total=Coalesce(Sum("sale_price"), Decimal("0"))
    )["total"]

    now = timezone.now()
    today = now.date()
    installment_qs = InstallmentScheduleEntry.objects.filter(
        contract__is_archived=False
    )
    if branch_name:
        installment_qs = installment_qs.filter(
            contract__vehicle__branch_name=branch_name
        )

    todays_installments = installment_qs.filter(due_date=today).count()
    overdue_installments = installment_qs.filter(
        status=ScheduleStatus.OVERDUE
    ).count()

    reservation_qs = Reservation.objects.filter(
        is_archived=False,
        status=ReservationStatus.ACTIVE,
        expires_at__gte=now,
    )
    if branch_name:
        reservation_qs = reservation_qs.filter(vehicle__branch_name=branch_name)
    todays_reservations = reservation_qs.filter(created_at__date=today).count()

    financial = compute_financial_summary(branch_name=branch_name)

    return {
        "branch_name": branch_name or "",
        "available_vehicles": available,
        "sold_vehicles": sold,
        "reserved_vehicles": reserved,
        "maintenance_vehicles": maintenance,
        "customer_count": customer_qs.count(),
        "lead_count": lead_qs.count(),
        "total_sales": int(revenue or 0),
        "total_expenses": financial["total_expenses"],
        "net_profit": financial["net_profit"],
        "inventory_value": int(inventory_value or 0),
        "todays_installments": todays_installments,
        "overdue_installments": overdue_installments,
        "todays_reservations": todays_reservations,
        "invoice_count": invoice_qs.count(),
        "generated_at": now.isoformat(),
    }


def global_search(*, query: str, branch_name: str | None, limit: int = 20) -> dict:
    q = (query or "").strip()
    if len(q) < 2:
        return {"query": q, "results": [], "groups": {}}

    limit = min(max(limit, 1), 50)
    per_group = max(limit // 3, 5)

    vehicle_qs = _vehicle_qs(branch_name).filter(
        Q(internal_number__icontains=q)
        | Q(vin__icontains=q)
        | Q(plate_number__icontains=q)
        | Q(manufacturer__icontains=q)
        | Q(model__icontains=q)
    )[:per_group]

    customer_qs = Customer.objects.filter(is_archived=False)
    if branch_name:
        customer_qs = customer_qs.filter(branch_name=branch_name)
    customer_qs = customer_qs.filter(
        Q(name__icontains=q)
        | Q(phone__icontains=q)
        | Q(email__icontains=q)
        | Q(id_number__icontains=q)
    )[:per_group]

    lead_qs = Lead.objects.filter(is_archived=False)
    if branch_name:
        lead_qs = lead_qs.filter(branch_name=branch_name)
    lead_qs = lead_qs.filter(
        Q(name__icontains=q)
        | Q(phone__icontains=q)
        | Q(source__icontains=q)
    )[:per_group]

    invoice_qs = SaleInvoice.objects.filter(is_archived=False).select_related(
        "customer", "vehicle"
    )
    if branch_name:
        invoice_qs = invoice_qs.filter(vehicle__branch_name=branch_name)
    invoice_qs = invoice_qs.filter(
        Q(document_number__icontains=q)
        | Q(customer__name__icontains=q)
        | Q(vehicle__vin__icontains=q)
    )[:per_group]

    results = []
    groups: dict[str, list] = {
        "vehicles": [],
        "customers": [],
        "leads": [],
        "invoices": [],
    }

    for v in vehicle_qs:
        item = {
            "type": "vehicle",
            "id": str(v.id),
            "title": f"{v.manufacturer} {v.model} ({v.year})",
            "subtitle": f"{v.internal_number} · {v.vin}",
            "status": v.status,
            "href": f"/dashboard/cars",
        }
        groups["vehicles"].append(item)
        results.append(item)

    for c in customer_qs:
        item = {
            "type": "customer",
            "id": str(c.id),
            "title": c.name,
            "subtitle": c.phone,
            "status": "",
            "href": "/dashboard/customers",
        }
        groups["customers"].append(item)
        results.append(item)

    for lead in lead_qs:
        item = {
            "type": "lead",
            "id": str(lead.id),
            "title": lead.name,
            "subtitle": lead.phone,
            "status": lead.status,
            "href": "/dashboard/leads",
        }
        groups["leads"].append(item)
        results.append(item)

    for inv in invoice_qs:
        vehicle_label = ""
        if inv.vehicle_id:
            vehicle_label = f"{inv.vehicle.manufacturer} {inv.vehicle.model}"
        item = {
            "type": "invoice",
            "id": str(inv.id),
            "title": inv.document_number or str(inv.id)[:8],
            "subtitle": f"{inv.customer.name if inv.customer_id else ''} · {vehicle_label}".strip(
                " ·"
            ),
            "status": inv.status,
            "href": "/dashboard/sales",
        }
        groups["invoices"].append(item)
        results.append(item)

    return {"query": q, "results": results[:limit], "groups": groups}


def build_notifications(*, branch_name: str | None, limit: int = 40) -> list[dict]:
    now = timezone.now()
    soon = now + timedelta(days=2)
    items: list[dict] = []

    installment_qs = InstallmentScheduleEntry.objects.filter(
        contract__is_archived=False,
        status__in=[ScheduleStatus.PENDING, ScheduleStatus.OVERDUE],
    ).select_related("contract", "contract__customer", "contract__vehicle")
    if branch_name:
        installment_qs = installment_qs.filter(
            contract__vehicle__branch_name=branch_name
        )

    for entry in installment_qs.order_by("due_date")[:15]:
        overdue = entry.status == ScheduleStatus.OVERDUE or (
            entry.due_date and entry.due_date < now.date()
        )
        customer_name = ""
        if entry.contract.customer_id:
            customer_name = entry.contract.customer.name
        items.append(
            {
                "id": f"installment-{entry.id}",
                "kind": "installment_overdue" if overdue else "installment_due",
                "severity": "high" if overdue else "medium",
                "title": "قسط متأخر" if overdue else "قسط مستحق",
                "body": f"{customer_name} — {int(entry.amount)} د.ع — {entry.due_date}",
                "href": "/dashboard/installments",
                "created_at": entry.due_date.isoformat() if entry.due_date else now.isoformat(),
                "read": False,
            }
        )

    reservation_qs = Reservation.objects.filter(
        is_archived=False,
        status=ReservationStatus.ACTIVE,
        expires_at__lte=soon,
        expires_at__gte=now,
    ).select_related("vehicle", "customer")
    if branch_name:
        reservation_qs = reservation_qs.filter(vehicle__branch_name=branch_name)
    for res in reservation_qs.order_by("expires_at")[:10]:
        items.append(
            {
                "id": f"reservation-{res.id}",
                "kind": "reservation_expiring",
                "severity": "medium",
                "title": "حجز ينتهي قريباً",
                "body": f"{res.customer.name if res.customer_id else ''} — {res.vehicle.internal_number if res.vehicle_id else ''}",
                "href": "/dashboard/reservations",
                "created_at": res.expires_at.isoformat(),
                "read": False,
            }
        )

    lead_qs = Lead.objects.filter(
        is_archived=False,
        next_follow_up__isnull=False,
        next_follow_up__lte=soon,
    )
    if branch_name:
        lead_qs = lead_qs.filter(branch_name=branch_name)
    for lead in lead_qs.order_by("next_follow_up")[:10]:
        items.append(
            {
                "id": f"lead-{lead.id}",
                "kind": "lead_follow_up",
                "severity": "low",
                "title": "متابعة عميل محتمل",
                "body": f"{lead.name} — {lead.phone}",
                "href": "/dashboard/leads",
                "created_at": lead.next_follow_up.isoformat(),
                "read": False,
            }
        )

    failed_backup = (
        BackupRecord.objects.filter(status=BackupRecord.STATUS_FAILED)
        .order_by("-created_at")
        .first()
    )
    if failed_backup:
        items.append(
            {
                "id": f"backup-{failed_backup.id}",
                "kind": "backup_failed",
                "severity": "high",
                "title": "فشل نسخ احتياطي",
                "body": failed_backup.error_message or failed_backup.file_name,
                "href": "/dashboard/backup-sync",
                "created_at": failed_backup.created_at.isoformat(),
                "read": False,
            }
        )

    error_count = SystemErrorLog.objects.filter(
        created_at__gte=now - timedelta(hours=24)
    ).count()
    if error_count > 0:
        items.append(
            {
                "id": "system-errors-24h",
                "kind": "system_error",
                "severity": "medium",
                "title": "أخطاء نظام خلال 24 ساعة",
                "body": f"{error_count} حدث مسجّل",
                "href": "/dashboard/system-health",
                "created_at": now.isoformat(),
                "read": False,
            }
        )

    items.sort(key=lambda x: (0 if x["severity"] == "high" else 1, x["created_at"]))
    return items[:limit]


def list_document_archive(*, branch_name: str | None, limit: int = 100) -> list[dict]:
    qs = VehicleDocument.objects.select_related("vehicle").order_by("-created_at")
    if branch_name:
        qs = qs.filter(vehicle__branch_name=branch_name)
    rows = []
    for doc in qs[:limit]:
        v = doc.vehicle
        rows.append(
            {
                "id": str(doc.id),
                "title": doc.title,
                "doc_type": doc.doc_type,
                "file_name": doc.file_name,
                "vehicle_id": str(v.id),
                "vehicle_label": f"{v.manufacturer} {v.model} ({v.internal_number})",
                "branch_name": v.branch_name,
                "created_at": doc.created_at.isoformat(),
            }
        )
    return rows


def build_customer_timeline(customer_id) -> list[dict]:
    try:
        customer = Customer.objects.get(pk=customer_id)
    except Customer.DoesNotExist:
        return []

    events: list[dict] = []

    events.append(
        {
            "id": f"customer-created-{customer.id}",
            "kind": "customer",
            "title": "تسجيل العميل",
            "body": customer.notes or "تم إنشاء ملف العميل.",
            "created_at": customer.created_at.isoformat(),
        }
    )

    for note in CustomerNote.objects.filter(customer=customer).order_by("-created_at")[:50]:
        events.append(
            {
                "id": f"note-{note.id}",
                "kind": "note",
                "title": "ملاحظة",
                "body": note.body,
                "author": note.author_name,
                "created_at": note.created_at.isoformat(),
            }
        )

    for lead in Lead.objects.filter(
        Q(phone=customer.phone) | Q(name__iexact=customer.name)
    ).prefetch_related("notes")[:20]:
        events.append(
            {
                "id": f"lead-{lead.id}",
                "kind": "lead",
                "title": f"عميل محتمل — {lead.get_status_display()}",
                "body": lead.note or lead.source,
                "created_at": lead.created_at.isoformat(),
            }
        )
        for ln in lead.notes.all()[:10]:
            events.append(
                {
                    "id": f"lead-note-{ln.id}",
                    "kind": "lead_note",
                    "title": "متابعة (محتمل)",
                    "body": ln.body,
                    "author": ln.author_name,
                    "created_at": ln.created_at.isoformat(),
                }
            )

    invoices = SaleInvoice.objects.filter(customer=customer, is_archived=False).select_related(
        "vehicle"
    )[:30]
    for inv in invoices:
        vehicle_label = ""
        if inv.vehicle_id:
            vehicle_label = f"{inv.vehicle.manufacturer} {inv.vehicle.model}"
        events.append(
            {
                "id": f"invoice-{inv.id}",
                "kind": "sale",
                "title": f"فاتورة {inv.document_number}",
                "body": f"{vehicle_label} — {int(inv.net_total)} د.ع",
                "created_at": inv.created_at.isoformat(),
            }
        )

    reservations = Reservation.objects.filter(customer=customer, is_archived=False)[:20]
    for res in reservations:
        events.append(
            {
                "id": f"reservation-{res.id}",
                "kind": "reservation",
                "title": "حجز سيارة",
                "body": f"عربون {int(res.deposit)} — ينتهي {res.expires_at.date()}",
                "created_at": res.created_at.isoformat(),
            }
        )

    for log in AuditLog.objects.filter(target_id=str(customer.id)).order_by("-created_at")[
        :20
    ]:
        events.append(
            {
                "id": f"audit-{log.id}",
                "kind": "audit",
                "title": log.action,
                "body": log.details or "",
                "author": log.actor.full_display_name if log.actor_id else "",
                "created_at": log.created_at.isoformat(),
            }
        )

    events.sort(key=lambda e: e["created_at"], reverse=True)
    return events
