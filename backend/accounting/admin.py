from django.contrib import admin

from .models import CashTransaction, DailyCashRegister, Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("category", "amount", "branch_name", "expense_type", "created_at")
    list_filter = ("expense_type", "branch_name", "is_archived")
    search_fields = ("category", "description")


@admin.register(DailyCashRegister)
class DailyCashRegisterAdmin(admin.ModelAdmin):
    list_display = ("branch_name", "business_date", "opening_balance", "is_closed")
    list_filter = ("branch_name", "is_closed")


@admin.register(CashTransaction)
class CashTransactionAdmin(admin.ModelAdmin):
    list_display = ("register", "direction", "amount", "category", "created_at")
    list_filter = ("direction",)
