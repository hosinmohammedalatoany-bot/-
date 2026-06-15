import uuid

from django.conf import settings
from django.db import models


class BackupRecord(models.Model):
    KIND_MANUAL = "manual"
    KIND_AUTO = "auto"
    KIND_CHOICES = [
        (KIND_MANUAL, "يدوي"),
        (KIND_AUTO, "تلقائي"),
    ]

    STATUS_PENDING = "pending"
    STATUS_SUCCESS = "success"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_PENDING, "قيد التنفيذ"),
        (STATUS_SUCCESS, "نجاح"),
        (STATUS_FAILED, "فشل"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=16, choices=KIND_CHOICES, default=KIND_MANUAL)
    status = models.CharField(
        max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True
    )
    file_name = models.CharField(max_length=255, blank=True)
    file_path = models.CharField(max_length=512, blank=True)
    byte_size = models.PositiveBigIntegerField(default=0)
    entity_counts = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="backup_records",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.kind} {self.status} {self.file_name}"


class SystemErrorLog(models.Model):
    LEVEL_INFO = "info"
    LEVEL_WARNING = "warning"
    LEVEL_ERROR = "error"
    LEVEL_CRITICAL = "critical"
    LEVEL_CHOICES = [
        (LEVEL_INFO, "معلومة"),
        (LEVEL_WARNING, "تحذير"),
        (LEVEL_ERROR, "خطأ"),
        (LEVEL_CRITICAL, "حرج"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    level = models.CharField(max_length=16, choices=LEVEL_CHOICES, default=LEVEL_ERROR)
    source = models.CharField(max_length=120, db_index=True)
    message = models.TextField()
    details = models.JSONField(default=dict, blank=True)
    request_path = models.CharField(max_length=512, blank=True)
    user_email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


class ClientSyncLog(models.Model):
    STATUS_SUCCESS = "success"
    STATUS_PARTIAL = "partial"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_SUCCESS, "نجاح"),
        (STATUS_PARTIAL, "جزئي"),
        (STATUS_FAILED, "فشل"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device_id = models.CharField(max_length=120, blank=True, db_index=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES)
    accepted_count = models.PositiveIntegerField(default=0)
    duplicate_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    remaining_count = models.PositiveIntegerField(default=0)
    message = models.TextField(blank=True)
    payload_summary = models.JSONField(default=dict, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="client_sync_logs",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
