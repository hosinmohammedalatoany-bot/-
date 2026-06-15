import uuid

from django.db import models


class CompanyProfile(models.Model):
    """Singleton company + print settings for Baraa Raed showroom."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    company_name = models.CharField(max_length=200, default="براء رائد لمعارض السيارات")
    address = models.CharField(max_length=500, blank=True, default="العراق")
    phone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    commercial_register = models.CharField(max_length=64, blank=True)
    tax_number = models.CharField(max_length=64, blank=True)
    currency = models.CharField(max_length=8, default="IQD")
    invoice_footer = models.TextField(blank=True)
    contract_legal_text = models.TextField(blank=True)
    print_margin_mm = models.PositiveSmallIntegerField(default=12)
    paper_size = models.CharField(max_length=16, default="A4")
    manager_name = models.CharField(max_length=120, blank=True, default="المدير العام")
    manager_title = models.CharField(max_length=120, blank=True, default="إدارة المعرض")
    show_qr = models.BooleanField(default=True)
    show_barcode = models.BooleanField(default=True)
    show_stamp = models.BooleanField(default=True)
    show_manager_signature = models.BooleanField(default=True)
    show_client_signature = models.BooleanField(default=True)
    logo_data_url = models.TextField(blank=True)
    stamp_data_url = models.TextField(blank=True)
    signature_data_url = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "ملف الشركة"
        verbose_name_plural = "ملف الشركة"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls) -> "CompanyProfile":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self) -> str:
        return self.company_name


class BranchPrintOverride(models.Model):
    """Optional per-branch print header overrides."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.OneToOneField(
        "accounts.Branch",
        on_delete=models.CASCADE,
        related_name="print_override",
    )
    branch_display_name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    address = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
