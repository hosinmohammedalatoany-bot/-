import uuid
from decimal import Decimal

from django.db import models
from django.utils import timezone


class ContractStatus(models.TextChoices):
    ACTIVE = "active", "نشط"
    COMPLETED = "completed", "مكتمل"
    CANCELLED = "cancelled", "ملغي"


class ScheduleStatus(models.TextChoices):
    PENDING = "pending", "مستحق"
    PAID = "paid", "مدفوع"
    OVERDUE = "overdue", "متأخر"


class InstallmentContract(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract_number = models.CharField(max_length=32, unique=True, db_index=True)
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.PROTECT,
        related_name="installment_contracts",
    )
    vehicle = models.ForeignKey(
        "vehicles.Vehicle",
        on_delete=models.PROTECT,
        related_name="installment_contracts",
    )
    sale_invoice = models.ForeignKey(
        "sales.SaleInvoice",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installment_contracts",
    )
    total_amount = models.DecimalField(max_digits=14, decimal_places=0)
    down_payment = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    installment_count = models.PositiveSmallIntegerField(default=1)
    branch_name = models.CharField(max_length=120, default="الفرع الرئيسي")
    start_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=ContractStatus.choices,
        default=ContractStatus.ACTIVE,
        db_index=True,
    )
    notes = models.TextField(blank=True, default="")
    is_archived = models.BooleanField(default=False, db_index=True)
    created_by = models.ForeignKey(
        "accounts.ShowroomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installment_contracts_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def financed_amount(self) -> Decimal:
        return self.total_amount - self.down_payment

    def __str__(self) -> str:
        return self.contract_number


class InstallmentScheduleEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(
        InstallmentContract,
        on_delete=models.CASCADE,
        related_name="schedule_entries",
    )
    sequence = models.PositiveSmallIntegerField()
    due_date = models.DateField(db_index=True)
    amount = models.DecimalField(max_digits=14, decimal_places=0)
    paid_amount = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    status = models.CharField(
        max_length=20,
        choices=ScheduleStatus.choices,
        default=ScheduleStatus.PENDING,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["contract", "sequence"]
        constraints = [
            models.UniqueConstraint(
                fields=["contract", "sequence"],
                name="uniq_schedule_sequence_per_contract",
            ),
        ]

    def refresh_status(self, save: bool = True) -> str:
        today = timezone.localdate()
        if self.paid_amount >= self.amount:
            new_status = ScheduleStatus.PAID
        elif self.due_date < today and self.paid_amount < self.amount:
            new_status = ScheduleStatus.OVERDUE
        else:
            new_status = ScheduleStatus.PENDING
        if self.status != new_status:
            self.status = new_status
            if save:
                self.save(update_fields=["status", "updated_at"])
        return self.status

    def remaining(self) -> Decimal:
        return max(Decimal("0"), self.amount - self.paid_amount)

    def __str__(self) -> str:
        return f"{self.contract.contract_number} #{self.sequence}"


class InstallmentPayment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    schedule_entry = models.ForeignKey(
        InstallmentScheduleEntry,
        on_delete=models.PROTECT,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=0)
    payment_date = models.DateField(default=timezone.localdate)
    receipt_reference = models.CharField(max_length=64, blank=True, default="")
    sale_invoice = models.ForeignKey(
        "sales.SaleInvoice",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installment_payments",
    )
    notes = models.TextField(blank=True, default="")
    recorded_by = models.ForeignKey(
        "accounts.ShowroomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installment_payments_recorded",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"دفعة {self.amount} — {self.schedule_entry_id}"
