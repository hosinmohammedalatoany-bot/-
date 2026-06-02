from django.contrib import admin

from .models import PrintLog, Reservation, SaleInvoice


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("id", "vehicle", "customer", "status", "deposit", "expires_at", "is_archived")
    list_filter = ("status", "is_archived")
    search_fields = ("vehicle__internal_number", "customer__name", "employee_name")


@admin.register(SaleInvoice)
class SaleInvoiceAdmin(admin.ModelAdmin):
    list_display = (
        "document_number",
        "vehicle",
        "customer",
        "payment_type",
        "total",
        "discount",
        "status",
        "created_at",
    )
    list_filter = ("status", "payment_type", "is_archived")
    search_fields = ("document_number", "vehicle__internal_number", "customer__name")


@admin.register(PrintLog)
class PrintLogAdmin(admin.ModelAdmin):
    list_display = (
        "document_type",
        "document_number",
        "branch_name",
        "print_count",
        "printed_at",
        "actor",
    )
    list_filter = ("document_type",)
    search_fields = ("document_number",)
