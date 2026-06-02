from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from accounts.roles import has_permission
from accounts.services import log_audit
from customers.models import Customer
from vehicles.models import Vehicle, VehicleStatus

from .models import (
    InvoiceStatus,
    PaymentType,
    PrintLog,
    Reservation,
    ReservationStatus,
    SaleInvoice,
)

# نسبة الخصم التي تتطلب موافقة إدارية
DISCOUNT_APPROVAL_PERCENT = Decimal("10")


def _next_document_number() -> str:
    last = (
        SaleInvoice.objects.filter(document_number__startswith="INV-")
        .order_by("-document_number")
        .values_list("document_number", flat=True)
        .first()
    )
    if not last:
        return "INV-000001"
    try:
        seq = int(last.split("-")[-1]) + 1
    except ValueError:
        seq = SaleInvoice.objects.count() + 1
    return f"INV-{seq:06d}"


def _can_override_vehicle_lock(user) -> bool:
    return user.role == "admin" or user.is_superuser or has_permission(
        user.role, user.extra_permissions, "sale.override_lock"
    )


def _can_approve_discount(user) -> bool:
    return user.role == "admin" or user.is_superuser or has_permission(
        user.role, user.extra_permissions, "discount.approve"
    )


def _discount_needs_approval(total: Decimal, discount: Decimal) -> bool:
    if discount <= 0 or total <= 0:
        return False
    pct = (discount / total) * Decimal("100")
    return pct > DISCOUNT_APPROVAL_PERCENT


def _active_reservation_for_vehicle(vehicle_id) -> Reservation | None:
    now = timezone.now()
    return (
        Reservation.objects.filter(
            vehicle_id=vehicle_id,
            status=ReservationStatus.ACTIVE,
            is_archived=False,
            expires_at__gte=now,
        )
        .order_by("-created_at")
        .first()
    )


def _sync_vehicle_status_from_reservations(vehicle: Vehicle) -> None:
    if vehicle.status == VehicleStatus.SOLD:
        return
    active = _active_reservation_for_vehicle(vehicle.id)
    if active:
        if vehicle.status != VehicleStatus.RESERVED:
            vehicle.status = VehicleStatus.RESERVED
            vehicle.save(update_fields=["status", "updated_at"])
    elif vehicle.status == VehicleStatus.RESERVED:
        vehicle.status = VehicleStatus.AVAILABLE
        vehicle.save(update_fields=["status", "updated_at"])


@transaction.atomic
def create_reservation(
    *,
    user,
    vehicle: Vehicle,
    customer: Customer,
    employee_name: str,
    deposit: Decimal,
    expires_at,
) -> Reservation:
    if vehicle.is_archived:
        raise ValueError("السيارة مؤرشفة ولا يمكن حجزها.")
    if vehicle.status == VehicleStatus.SOLD:
        raise ValueError("السيارة مباعة ولا يمكن حجزها.")
    if vehicle.status == VehicleStatus.RESERVED and _active_reservation_for_vehicle(vehicle.id):
        raise ValueError("السيارة محجوزة مسبقاً.")

    reservation = Reservation.objects.create(
        vehicle=vehicle,
        customer=customer,
        employee_name=employee_name,
        deposit=deposit,
        expires_at=expires_at,
        created_by=user,
    )
    vehicle.status = VehicleStatus.RESERVED
    vehicle.save(update_fields=["status", "updated_at"])
    log_audit(
        action="reservation.create",
        actor=user,
        target_id=str(reservation.id),
        details=f"حجز سيارة {vehicle.internal_number} للعميل {customer.name}",
    )
    return reservation


@transaction.atomic
def cancel_reservation(*, user, reservation: Reservation) -> Reservation:
    if reservation.is_archived:
        raise ValueError("الحجز غير موجود.")
    reservation.status = ReservationStatus.CANCELLED
    reservation.is_archived = True
    reservation.save(update_fields=["status", "is_archived", "updated_at"])
    _sync_vehicle_status_from_reservations(reservation.vehicle)
    log_audit(
        action="reservation.cancel",
        actor=user,
        target_id=str(reservation.id),
        details=f"إلغاء حجز {reservation.id}",
    )
    return reservation


@transaction.atomic
def create_sale_invoice(
    *,
    user,
    vehicle: Vehicle,
    customer: Customer,
    payment_type: str,
    total: Decimal,
    discount: Decimal,
    tax: Decimal,
    force_reserved_sale: bool = False,
    force_discount: bool = False,
) -> SaleInvoice:
    vehicle = Vehicle.objects.select_for_update().get(pk=vehicle.pk)

    if vehicle.is_archived:
        raise ValueError("السيارة مؤرشفة.")
    if vehicle.status == VehicleStatus.SOLD:
        raise ValueError("لا يمكن بيع نفس السيارة مرتين.")
    if SaleInvoice.objects.filter(
        vehicle=vehicle,
        status=InvoiceStatus.ISSUED,
        is_archived=False,
    ).exists():
        raise ValueError("توجد فاتورة بيع نشطة لهذه السيارة.")

    active_res = _active_reservation_for_vehicle(vehicle.id)
    reserved_override = False
    if vehicle.status == VehicleStatus.RESERVED or active_res:
        if not force_reserved_sale and not _can_override_vehicle_lock(user):
            raise ValueError("السيارة محجوزة — يلزم صلاحية بيع سيارة محجوزة.")
        reserved_override = True

    needs_approval = _discount_needs_approval(total, discount)
    discount_ok = not needs_approval
    if needs_approval:
        if force_discount or _can_approve_discount(user):
            discount_ok = True
        else:
            raise ValueError(
                f"الخصم يتجاوز {DISCOUNT_APPROVAL_PERCENT}% — يلزم موافقة إدارية."
            )

    if payment_type not in dict(PaymentType.choices):
        raise ValueError("طريقة الدفع غير صالحة.")

    invoice = SaleInvoice.objects.create(
        document_number=_next_document_number(),
        vehicle=vehicle,
        customer=customer,
        payment_type=payment_type,
        total=total,
        discount=discount,
        tax=tax,
        status=InvoiceStatus.ISSUED,
        discount_requires_approval=needs_approval,
        discount_approved=discount_ok,
        discount_approved_by=user if needs_approval and discount_ok else None,
        sold_with_reserved_override=reserved_override,
        created_by=user,
    )

    vehicle.status = VehicleStatus.SOLD
    vehicle.save(update_fields=["status", "updated_at"])

    Reservation.objects.filter(
        vehicle=vehicle,
        status=ReservationStatus.ACTIVE,
        is_archived=False,
    ).update(status=ReservationStatus.CONVERTED, is_archived=True)

    customer.purchases = (customer.purchases or 0) + 1
    customer.save(update_fields=["purchases", "updated_at"])

    log_audit(
        action="sale.create",
        actor=user,
        target_id=str(invoice.id),
        details=f"بيع {vehicle.internal_number} — {invoice.document_number}",
    )
    return invoice


@transaction.atomic
def archive_sale_invoice(*, user, invoice: SaleInvoice) -> SaleInvoice:
    if invoice.is_archived:
        raise ValueError("الفاتورة غير موجودة.")
    if invoice.status == InvoiceStatus.ISSUED:
        vehicle = Vehicle.objects.select_for_update().get(pk=invoice.vehicle_id)
        if vehicle.status == VehicleStatus.SOLD:
            vehicle.status = VehicleStatus.AVAILABLE
            vehicle.save(update_fields=["status", "updated_at"])
    invoice.status = InvoiceStatus.CANCELLED
    invoice.is_archived = True
    invoice.save(update_fields=["status", "is_archived", "updated_at"])
    log_audit(
        action="sale.archive",
        actor=user,
        target_id=str(invoice.id),
        details=f"أرشفة فاتورة {invoice.document_number}",
    )
    return invoice


def record_print_log(
    *,
    user,
    document_type: str,
    document_number: str,
    branch_name: str = "الفرع الرئيسي",
    invoice: SaleInvoice | None = None,
) -> PrintLog:
    existing = (
        PrintLog.objects.filter(
            document_type=document_type,
            document_number=document_number,
        )
        .order_by("-printed_at")
        .first()
    )
    if existing:
        existing.print_count += 1
        existing.printed_at = timezone.now()
        if user:
            existing.actor = user
        existing.save(update_fields=["print_count", "printed_at", "actor"])
        log_audit(
            action="print.repeat",
            actor=user,
            target_id=str(existing.id),
            details=f"إعادة طباعة {document_type} {document_number}",
        )
        return existing

    entry = PrintLog.objects.create(
        document_type=document_type,
        document_number=document_number,
        branch_name=branch_name or "الفرع الرئيسي",
        invoice=invoice,
        actor=user,
    )
    log_audit(
        action="print.create",
        actor=user,
        target_id=str(entry.id),
        details=f"طباعة {document_type} {document_number}",
    )
    return entry


def resolve_invoice_for_print(document_number: str) -> SaleInvoice | None:
    if not document_number:
        return None
    return (
        SaleInvoice.objects.filter(document_number__iexact=document_number.strip())
        .select_related("vehicle", "customer")
        .first()
    )
