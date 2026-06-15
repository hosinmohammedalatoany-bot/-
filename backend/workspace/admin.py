from django.contrib import admin

from .models import SavedFilter


@admin.register(SavedFilter)
class SavedFilterAdmin(admin.ModelAdmin):
    list_display = ("name", "module_key", "owner", "is_default", "updated_at")
    list_filter = ("module_key", "is_default")
    search_fields = ("name", "owner__email")
