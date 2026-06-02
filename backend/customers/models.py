import uuid

from django.db import models


class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=32, db_index=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    id_number = models.CharField(max_length=64, blank=True, db_index=True)
    balance = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    purchases = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    branch = models.ForeignKey(
        "accounts.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customers",
    )
    branch_name = models.CharField(max_length=120, blank=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    created_by = models.ForeignKey(
        "accounts.ShowroomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customers_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class LeadStatus(models.TextChoices):
    INTERESTED = "interested", "مهتم"
    CONTACT = "contact", "تواصل"
    RESERVED = "reserved", "حجز"
    PURCHASED = "purchased", "اشترى"
    CANCELLED = "cancelled", "ملغي"


class LeadSource(models.TextChoices):
    WHATSAPP = "WhatsApp", "واتساب"
    FACEBOOK = "Facebook", "فيسبوك"
    INSTAGRAM = "Instagram", "إنستغرام"
    WALK_IN = "Walk-In", "زيارة مباشرة"
    PHONE = "Phone Call", "اتصال هاتفي"


class Lead(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=32, db_index=True)
    source = models.CharField(max_length=32, choices=LeadSource.choices, default=LeadSource.WHATSAPP)
    assigned_to = models.CharField(max_length=120, blank=True)
    vehicle = models.ForeignKey(
        "vehicles.Vehicle",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="leads",
    )
    status = models.CharField(
        max_length=20,
        choices=LeadStatus.choices,
        default=LeadStatus.INTERESTED,
        db_index=True,
    )
    next_follow_up = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True)
    branch = models.ForeignKey(
        "accounts.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="leads",
    )
    branch_name = models.CharField(max_length=120, blank=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    created_by = models.ForeignKey(
        "accounts.ShowroomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="leads_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return self.name


class LeadNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="notes")
    body = models.TextField()
    author_name = models.CharField(max_length=120, blank=True)
    created_by = models.ForeignKey(
        "accounts.ShowroomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lead_notes_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
