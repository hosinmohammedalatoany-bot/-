from django.contrib import admin

from .models import Customer, Lead, LeadNote


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "purchases", "balance", "is_archived", "created_at")
    search_fields = ("name", "phone", "id_number")
    list_filter = ("is_archived",)


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "status", "source", "assigned_to", "is_archived")
    list_filter = ("status", "source", "is_archived")
    search_fields = ("name", "phone")


@admin.register(LeadNote)
class LeadNoteAdmin(admin.ModelAdmin):
    list_display = ("lead", "author_name", "created_at")
