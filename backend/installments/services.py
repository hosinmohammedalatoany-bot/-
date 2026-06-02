from __future__ import annotations

from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone

from accounts.services import log_audit
from sales.models import PaymentType, SaleInvoice

from .models import (
    ContractStatus,
    InstallmentContract,
    InstallmentPayment,
    InstallmentScheduleEntry,
    ScheduleStatus,
)


def _next_contract_number() -> str:
    last = (
        InstallmentContract.objects.order_by("-created_at")
        .values_list("contract_number", flat=True)
        .first()
    )
    if not last or not last.startswith("INST-"):
        return "INST-000001"
    try:
        num = int(last.split("-")[-1]) + 1
    except ValueError:
        num = 1
    return f"INST-{num:06d}"


def _split_installments(total: Decimal, count: int) -> list[Decimal]:
    if count < 1:
        raise ValueError("عدد الأقساط يجب أن يكون 1 على الأقل.")
    base = (total / count).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    amounts = [base] * count
    diff = total - sum(amounts)
    if diff != 0:
        amounts[-1] += diff
    return amounts


@transaction.atomic
def create_installment_contract(
    *,
    user,
    customer,
    vehicle,
    total_amount: Decimal,
    down_payment: Decimal,
    installment_count: int,
    start_date,
    branch_name: str = "",
    sale_invoice: SaleInvoice | None = None,
    interval_days: int = 30,
    notes: str = "",
) -> InstallmentContract:
    if down_payment < 0:
        raise ValueError("الدفعة المقدمة لا يمكن أن تكون سالبة.")
    if down_payment > total_amount:
        raise ValueError("الدفعة المقدمة أكبر من إجمالي العقد.")
    financed = total_amount - down_payment
    if financed <= 0:
        raise ValueError("مبلغ التقسيط يجب أن يكون أكبر من صفر.")

    if sale_invoice:
        if sale_invoice.payment_type not in (
            PaymentType.INSTALLMENT,
            PaymentType.MIXED,
        ):
            raise ValueError("الفاتورة المرتبطة ليست فاتورة تقسيط.")
        if InstallmentContract.objects.filter(
            sale_invoice=sale_invoice, is_archived=False
        ).exists():
            raise ValueError("يوجد عقد تقسيط مرتبط بهذه الفاتورة مسبقاً.")

    contract = InstallmentContract.objects.create(
        contract_number=_next_contract_number(),
        customer=customer,
        vehicle=vehicle,
        sale_invoice=sale_invoice,
        total_amount=total_amount,
        down_payment=down_payment,
        installment_count=installment_count,
        branch_name=branch_name or getattr(user, "branch", "") or "الفرع الرئيسي",
        start_date=start_date,
        notes=notes.strip(),
        created_by=user,
    )

    per_installment = _split_installments(financed, installment_count)
    due = start_date
    for seq, amount in enumerate(per_installment, start=1):
        entry = InstallmentScheduleEntry.objects.create(
            contract=contract,
            sequence=seq,
            due_date=due,
            amount=amount,
            paid_amount=Decimal("0"),
            status=ScheduleStatus.PENDING,
        )
        entry.refresh_status()
        due = due + timedelta(days=interval_days)

    log_audit(
        action="installment.contract.create",
        actor=user,
        target_id=str(contract.id),
        details=f"عقد تقسيط {contract.contract_number} — {installment_count} قسط",
    )
    return contract


def refresh_contract_status(contract: InstallmentContract) -> None:
    entries = list(contract.schedule_entries.all())
    for entry in entries:
        entry.refresh_status()
    if not entries:
        return
    if all(e.status == ScheduleStatus.PAID for e in entries):
        if contract.status != ContractStatus.COMPLETED:
            contract.status = ContractStatus.COMPLETED
            contract.save(update_fields=["status", "updated_at"])
    elif contract.status == ContractStatus.COMPLETED:
        contract.status = ContractStatus.ACTIVE
        contract.save(update_fields=["status", "updated_at"])


@transaction.atomic
def record_installment_payment(
    *,
    user,
    schedule_entry: InstallmentScheduleEntry,
    amount: Decimal,
    payment_date=None,
    receipt_reference: str = "",
    sale_invoice: SaleInvoice | None = None,
    notes: str = "",
) -> InstallmentPayment:
    schedule_entry = (
        InstallmentScheduleEntry.objects.select_for_update()
        .select_related("contract")
        .get(pk=schedule_entry.pk)
    )
    if schedule_entry.contract.is_archived:
        raise ValueError("عقد التقسيط مؤرشف.")
    if schedule_entry.contract.status == ContractStatus.CANCELLED:
        raise ValueError("عقد التقسيط ملغي.")

    remaining = schedule_entry.remaining()
    if amount <= 0:
        raise ValueError("مبلغ الدفعة يجب أن يكون أكبر من صفر.")
    if amount > remaining:
        raise ValueError("مبلغ الدفعة أكبر من المتبقي على القسط.")

    payment = InstallmentPayment.objects.create(
        schedule_entry=schedule_entry,
        amount=amount,
        payment_date=payment_date or timezone.localdate(),
        receipt_reference=receipt_reference.strip(),
        sale_invoice=sale_invoice,
        notes=notes.strip(),
        recorded_by=user,
    )

    schedule_entry.paid_amount += amount
    schedule_entry.save(update_fields=["paid_amount", "updated_at"])
    schedule_entry.refresh_status()
    refresh_contract_status(schedule_entry.contract)

    log_audit(
        action="installment.payment.record",
        actor=user,
        target_id=str(schedule_entry.id),
        details=f"دفعة {amount} على {schedule_entry.contract.contract_number}",
    )
    return payment


@transaction.atomic
def delete_installment_payment(*, user, payment: InstallmentPayment) -> None:
    payment = InstallmentPayment.objects.select_for_update().select_related(
        "schedule_entry", "schedule_entry__contract"
    ).get(pk=payment.pk)
    entry = payment.schedule_entry
    if entry.paid_amount < payment.amount:
        raise ValueError("لا يمكن عكس الدفعة — الرصيد غير متسق.")
    entry.paid_amount -= payment.amount
    entry.save(update_fields=["paid_amount", "updated_at"])
    entry.refresh_status()
    payment.delete()
    refresh_contract_status(entry.contract)
    log_audit(
        action="installment.payment.delete",
        actor=user,
        target_id=str(entry.id),
        details=f"حذف دفعة {payment.amount}",
    )
