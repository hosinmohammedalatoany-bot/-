import uuid

from django.db import models


class VehicleStatus(models.TextChoices):
    AVAILABLE = "available", "متوفرة"
    RESERVED = "reserved", "محجوزة"
    SOLD = "sold", "مباعة"
    MAINTENANCE = "maintenance", "صيانة"
    TRANSFERRED = "transferred", "منقولة"
    NOT_READY = "not_ready", "غير جاهزة"


class Vehicle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    internal_number = models.CharField(max_length=64, db_index=True)
    vin = models.CharField(max_length=17, unique=True, db_index=True)
    plate_number = models.CharField(max_length=32, blank=True)
    manufacturer = models.CharField(max_length=80)
    model = models.CharField(max_length=80)
    trim = models.CharField(max_length=80, blank=True)
    year = models.PositiveSmallIntegerField()
    exterior_color = models.CharField(max_length=64, blank=True)
    interior_color = models.CharField(max_length=64, blank=True)
    fuel_type = models.CharField(max_length=32, blank=True, default="بنزين")
    transmission = models.CharField(max_length=32, blank=True, default="أوتوماتيك")
    mileage = models.PositiveIntegerField(default=0)
    purchase_price = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    sale_price = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    minimum_sale_price = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    maintenance_cost = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    transportation_cost = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    status = models.CharField(
        max_length=20,
        choices=VehicleStatus.choices,
        default=VehicleStatus.AVAILABLE,
        db_index=True,
    )
    branch = models.ForeignKey(
        "accounts.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vehicles",
    )
    branch_name = models.CharField(max_length=120, blank=True)
    supplier = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    created_by = models.ForeignKey(
        "accounts.ShowroomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vehicles_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["internal_number"],
                condition=models.Q(is_archived=False),
                name="uniq_active_internal_number",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.internal_number} — {self.manufacturer} {self.model}"


class VehicleImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="images")
    caption = models.CharField(max_length=120, blank=True)
    data_url = models.TextField()
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "created_at"]


class VehicleDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="documents")
    title = models.CharField(max_length=120)
    doc_type = models.CharField(max_length=32, blank=True, default="other")
    data_url = models.TextField(blank=True)
    file_name = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
