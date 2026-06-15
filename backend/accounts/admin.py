from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import AuditLog, Branch, ShowroomUser, UserSession


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "is_active", "created_at")
    search_fields = ("name", "code")


@admin.register(ShowroomUser)
class ShowroomUserAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "role", "branch", "status", "is_active", "last_login")
    list_filter = ("role", "status", "branch")
    search_fields = ("email", "first_name", "last_name", "phone")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("البيانات الشخصية", {"fields": ("first_name", "last_name", "phone")}),
        (
            "الصلاحيات",
            {
                "fields": (
                    "role",
                    "branch",
                    "status",
                    "email_verified",
                    "extra_permissions",
                    "must_change_password",
                )
            },
        ),
        (
            "النظام",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                    "last_login",
                    "date_joined",
                )
            },
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "role", "branch"),
            },
        ),
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "actor_email", "created_at")
    list_filter = ("action",)
    search_fields = ("actor_email", "details")
    readonly_fields = ("created_at",)


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ("user", "device_label", "is_active", "last_seen_at")
    list_filter = ("is_active",)
