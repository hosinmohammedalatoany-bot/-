from django.contrib import admin

from .models import InstallmentContract, InstallmentPayment, InstallmentScheduleEntry


class ScheduleEntryInline(admin.TabularInline):
    model = InstallmentScheduleEntry
    extra = 0
    readonly_fields = ("paid_amount", "status")


@admin.register(InstallmentContract)
class InstallmentContractAdmin(admin.ModelAdmin):
    list_display = (
        "contract_number",
        "customer",
        "vehicle",
        "total_amount",
        "status",
        "created_at",
    )
    list_filter = ("status", "is_archived")
    search_fields = ("contract_number", "customer__name")
    inlines = [ScheduleEntryInline]


@admin.register(InstallmentScheduleEntry)
class InstallmentScheduleEntryAdmin(admin.ModelAdmin):
    list_display = ("contract", "sequence", "due_date", "amount", "paid_amount", "status")
    list_filter = ("status",)


@admin.register(InstallmentPayment)
class InstallmentPaymentAdmin(admin.ModelAdmin):
    list_display = ("schedule_entry", "amount", "payment_date", "recorded_by", "created_at")
