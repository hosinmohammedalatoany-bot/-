from django.contrib import admin

from .models import BranchPrintOverride, CompanyProfile


@admin.register(CompanyProfile)
class CompanyProfileAdmin(admin.ModelAdmin):
    list_display = ("company_name", "currency", "updated_at")


@admin.register(BranchPrintOverride)
class BranchPrintOverrideAdmin(admin.ModelAdmin):
    list_display = ("branch", "branch_display_name", "updated_at")
