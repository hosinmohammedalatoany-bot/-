from rest_framework.permissions import BasePermission

from .roles import has_module_access, has_permission


class IsAuthenticatedActive(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return getattr(user, "status", None) == "active"


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.role == "admin" or user.is_superuser


class HasShowroomPermission(BasePermission):
    permission_code = ""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role == "admin" or user.is_superuser:
            return True
        code = getattr(view, "required_permission", None) or self.permission_code
        if not code:
            return True
        return has_permission(
            user.role,
            user.extra_permissions,
            code,
        )


def require_module(module_key: str):
    class _Perm(BasePermission):
        def has_permission(self, request, view):
            user = request.user
            if not user or not user.is_authenticated:
                return False
            if user.role == "admin" or user.is_superuser:
                return True
            return has_module_access(user.role, user.extra_permissions, module_key)

    return _Perm
