from django.contrib import admin

from .models import Vehicle, VehicleDocument, VehicleImage


class VehicleImageInline(admin.TabularInline):
    model = VehicleImage
    extra = 0


class VehicleDocumentInline(admin.TabularInline):
    model = VehicleDocument
    extra = 0


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ("internal_number", "vin", "manufacturer", "model", "status", "branch_name", "is_archived")
    list_filter = ("status", "is_archived", "branch_name")
    search_fields = ("internal_number", "vin", "manufacturer", "model")
    inlines = [VehicleImageInline, VehicleDocumentInline]
