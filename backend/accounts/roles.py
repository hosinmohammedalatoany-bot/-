"""Role and permission definitions aligned with the Next.js showroom app."""

from __future__ import annotations

ROLE_ADMIN = "admin"
ROLE_BRANCH_MANAGER = "branch_manager"
ROLE_ACCOUNTANT = "accountant"
ROLE_SALES = "sales"
ROLE_INVENTORY = "inventory"
ROLE_READ_ONLY = "read_only"

ROLE_CHOICES = [
    (ROLE_ADMIN, "مدير النظام"),
    (ROLE_BRANCH_MANAGER, "مدير فرع"),
    (ROLE_ACCOUNTANT, "محاسب"),
    (ROLE_SALES, "مبيعات"),
    (ROLE_INVENTORY, "مخزون"),
    (ROLE_READ_ONLY, "مشاهدة فقط"),
]

REGISTERABLE_ROLES = {
    ROLE_BRANCH_MANAGER,
    ROLE_ACCOUNTANT,
    ROLE_SALES,
    ROLE_INVENTORY,
    ROLE_READ_ONLY,
}

ROLE_LABELS_AR = dict(ROLE_CHOICES)

ROLE_PERMISSIONS: dict[str, list[str]] = {
    ROLE_ADMIN: [
        "*",
        "print.invoices",
        "print.contracts",
        "print.reports",
        "export.pdf",
        "export.excel",
        "users.manage",
        "settings.manage",
        "discount.approve",
        "vehicle.delete",
    ],
    ROLE_BRANCH_MANAGER: [
        "dashboard",
        "cars",
        "customers",
        "leads",
        "sales",
        "installments",
        "inventory",
        "reports",
        "branches",
        "settings",
        "print.invoices",
        "print.reports",
        "export.pdf",
        "export.excel",
        "discount.approve",
        "sale.override_lock",
        "reservations",
    ],
    ROLE_SALES: [
        "dashboard",
        "cars",
        "customers",
        "leads",
        "sales",
        "reservations",
        "whatsapp",
    ],
    ROLE_ACCOUNTANT: [
        "dashboard",
        "accounting",
        "installments",
        "reports",
        "print.reports",
        "export.pdf",
        "export.excel",
    ],
    ROLE_INVENTORY: [
        "dashboard",
        "cars",
        "inventory",
        "purchases",
        "maintenance",
    ],
    ROLE_READ_ONLY: ["dashboard", "cars", "customers", "reports"],
}

# Map legacy Next.js role slugs to API roles
LEGACY_ROLE_MAP = {
    "super-admin": ROLE_ADMIN,
    "branch-manager": ROLE_BRANCH_MANAGER,
    "accountant": ROLE_ACCOUNTANT,
    "sales": ROLE_SALES,
    "inventory": ROLE_INVENTORY,
    "read-only": ROLE_READ_ONLY,
}


def effective_permissions(role: str, extra: list[str] | None = None) -> list[str]:
    base = list(ROLE_PERMISSIONS.get(role, []))
    if extra:
        for p in extra:
            if p not in base:
                base.append(p)
    return base


def has_permission(role: str, extra: list[str] | None, permission: str) -> bool:
    perms = effective_permissions(role, extra)
    return "*" in perms or permission in perms


def has_module_access(role: str, extra: list[str] | None, module_key: str) -> bool:
    return has_permission(role, extra, module_key) or has_permission(role, extra, "*")
