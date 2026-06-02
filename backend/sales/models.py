import uuid

from django.db import models
from django.utils import timezone


class ReservationStatus(models.TextChoices):
    ACTIVE = "active", "نشط"
    EXPIRED = "expired", "منتهي"
    CANCELLED = "cancelled", "ملغي"
    CONVERTED = "converted", "تحوّل لبيع"


class PaymentType(models.TextChoices):
    CASH = "cash", "نقد"
    BANK_TRANSFER = "bank-transfer", "تحويل بنكي"
    INSTALLMENT = "installment", "تقسيط"
    MIXED = "mixed", "مختلط"


class InvoiceStatus(models.TextChoices):
    DRAFT = "draft", "مسودة"
    ISSUED = "issued", "صادرة"
    REVISED = "revised", "معدّلة"
    CANCELLED = "cancelled", "ملغاة"


class Reservation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(
        "vehicles.Vehicle",
        on_delete=models.PROTECT,
        related_name="reservations",
    )
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.PROTECT,
        related_name="reservations",
    )
    employee_name = models.CharField(max_length=120)
    deposit = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    expires_at = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=ReservationStatus.choices,
        default=ReservationStatus.ACTIVE,
        db_index=True,
    )
    is_archived = models.BooleanField(default=False, db_index=True)
    created_by = models.ForeignKey(
        "accounts.ShowroomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reservations_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def is_active(self) -> bool:
        if self.status != ReservationStatus.ACTIVE or self.is_archived:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True

    def __str__(self) -> str:
        return f"حجز {self.id} — {self.vehicle_id}"


class SaleInvoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document_number = models.CharField(max_length=32, unique=True, db_index=True)
    vehicle = models.ForeignKey(
        "vehicles.Vehicle",
        on_delete=models.PROTECT,
        related_name="sale_invoices",
    )
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.PROTECT,
        related_name="sale_invoices",
    )
    payment_type = models.CharField(
        max_length=20,
        choices=PaymentType.choices,
        default=PaymentType.CASH,
    )
    total = models.DecimalField(max_digits=14, decimal_places=0)
    discount = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    tax = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    status = models.CharField(
        max_length=20,
        choices=InvoiceStatus.choices,
        default=InvoiceStatus.ISSUED,
        db_index=True,
    )
    discount_requires_approval = models.BooleanField(default=False)
    discount_approved = models.BooleanField(default=False)
    discount_approved_by = models.ForeignKey(
        "accounts.ShowroomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="discount_approvals",
    )
    sold_with_reserved_override = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False, db_index=True)
    created_by = models.ForeignKey(
        "accounts.ShowroomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["vehicle"],
                condition=models.Q(
                    status=InvoiceStatus.ISSUED,
                    is_archived=False,
                ),
                name="uniq_active_sale_per_vehicle",
            ),
        ]

    @property
    def net_total(self):
        return self.total - self.discount + self.tax

    def __str__(self) -> str:
        return self.document_number


class PrintDocumentType(models.TextChoices):
    INVOICE = "invoice", "فاتورة"
    CONTRACT = "contract", "عقد"
    RECEIPT = "receipt", "إيصال"
    REPORT = "report", "تقرير"


class PrintLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document_type = models.CharField(max_length=20, choices=PrintDocumentType.choices, db_index=True)
    document_number = models.CharField(max_length=64, db_index=True)
    branch_name = models.CharField(max_length=120, default="الفرع الرئيسي")
    print_count = models.PositiveIntegerField(default=1)
    invoice = models.ForeignKey(
        SaleInvoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="print_logs",
    )
    actor = models.ForeignKey(
        "accounts.ShowroomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="print_logs",
    )
    printed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-printed_at"]
        indexes = [
            models.Index(fields=["document_type", "document_number"]),
        ]

    def __str__(self) -> str:
        return f"{self.document_type} {self.document_number}"
