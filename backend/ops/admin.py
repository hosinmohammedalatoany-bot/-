from django.contrib import admin

from .models import BackupRecord, ClientSyncLog, SystemErrorLog


@admin.register(BackupRecord)
class BackupRecordAdmin(admin.ModelAdmin):
    list_display = ("kind", "status", "file_name", "byte_size", "created_at")
    list_filter = ("kind", "status")
    readonly_fields = ("created_at", "completed_at")


@admin.register(SystemErrorLog)
class SystemErrorLogAdmin(admin.ModelAdmin):
    list_display = ("level", "source", "message", "created_at")
    list_filter = ("level", "source")
    search_fields = ("message", "user_email")


@admin.register(ClientSyncLog)
class ClientSyncLogAdmin(admin.ModelAdmin):
    list_display = ("status", "device_id", "accepted_count", "user", "created_at")
    list_filter = ("status",)
