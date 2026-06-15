import uuid

from django.db import models


class ExpenseCategory(models.TextChoices):
    GENERAL = "general", "عام"
    MAINTENANCE = "maintenance", "صيانة"
    TRANSPORT = "transport", "نقل"
    PURCHASE = "purchase", "شراء"
    PAYROLL = "payroll", "رواتب"
    MARKETING = "marketing", "تسويق"
    OTHER = "other", "أخرى"


class Expense(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.CharField(max_length=80)
    expense_type = models.CharField(
        max_length=20,
        choices=ExpenseCategory.choices,
        default=ExpenseCategory.GENERAL,
        db_index=True,
    )
    amount = models.DecimalField(max_digits=14, decimal_places=0)
    branch_name = models.CharField(max_length=120, default="الفرع الرئيسي")
    description = models.TextField(blank=True)
    vehicle = models.ForeignKey(
        "vehicles.Vehicle",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )
    sale_invoice = models.ForeignKey(
        "sales.SaleInvoice",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="linked_expenses",
    )
    is_archived = models.BooleanField(default=False, db_index=True)
    created_by = models.ForeignKey(
        "accounts.ShowroomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.category} — {self.amount}"


class CashDirection(models.TextChoices):
    IN = "in", "وارد"
    OUT = "out", "صادر"


class DailyCashRegister(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch_name = models.CharField(max_length=120, default="الفرع الرئيسي")
    business_date = models.DateField(db_index=True)
    opening_balance = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    notes = models.TextField(blank=True)
    is_closed = models.BooleanField(default=False)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        "accounts.ShowroomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cash_registers_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-business_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["branch_name", "business_date"],
                name="uniq_cash_register_branch_date",
            ),
        ]

    def __str__(self) -> str:
        return f"صندوق {self.branch_name} — {self.business_date}"


class CashTransaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    register = models.ForeignKey(
        DailyCashRegister,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    direction = models.CharField(max_length=8, choices=CashDirection.choices, db_index=True)
    amount = models.DecimalField(max_digits=14, decimal_places=0)
    category = models.CharField(max_length=80, default="حركة نقدية")
    reference_label = models.CharField(max_length=200, blank=True)
    vehicle = models.ForeignKey(
        "vehicles.Vehicle",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cash_transactions",
    )
    sale_invoice = models.ForeignKey(
        "sales.SaleInvoice",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cash_transactions",
    )
    expense = models.ForeignKey(
        Expense,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cash_transactions",
    )
    created_by = models.ForeignKey(
        "accounts.ShowroomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cash_transactions_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.direction} {self.amount}"
