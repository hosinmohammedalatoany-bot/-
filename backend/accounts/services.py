import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import AuditLog, EmailVerificationToken, PasswordResetToken, ShowroomUser
from .roles import effective_permissions


def log_audit(
    *,
    action: str,
    actor: ShowroomUser | None = None,
    actor_email: str = "",
    target_id: str = "",
    target_email: str = "",
    details: str = "",
) -> AuditLog:
    return AuditLog.objects.create(
        action=action,
        actor=actor,
        actor_email=actor_email or (actor.email if actor else ""),
        target_id=target_id,
        target_email=target_email,
        details=details,
    )


def is_strong_password(password: str) -> bool:
    return (
        len(password) >= 8
        and any(c.isupper() for c in password)
        and any(c.islower() for c in password)
        and any(c.isdigit() for c in password)
    )


def create_password_reset(user: ShowroomUser) -> PasswordResetToken:
    PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
    token = secrets.token_urlsafe(32)
    return PasswordResetToken.objects.create(
        user=user,
        token=token,
        expires_at=timezone.now() + timedelta(hours=24),
    )


def create_email_verification(user: ShowroomUser) -> EmailVerificationToken:
    EmailVerificationToken.objects.filter(user=user, used=False).update(used=True)
    token = secrets.token_urlsafe(32)
    return EmailVerificationToken.objects.create(
        user=user,
        token=token,
        expires_at=timezone.now() + timedelta(days=2),
    )


def user_payload(user: ShowroomUser) -> dict:
    branch_name = user.branch.name if user.branch_id else ""
    perms = effective_permissions(user.role, user.extra_permissions)
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.get_full_name() or user.email,
        "phone": user.phone,
        "role": user.role,
        "branch": branch_name,
        "branch_id": str(user.branch_id) if user.branch_id else None,
        "status": user.status,
        "email_verified": user.email_verified,
        "permissions": perms,
        "must_change_password": user.must_change_password,
    }


def reset_link_base() -> str:
    return getattr(settings, "FRONTEND_PASSWORD_RESET_URL", "").rstrip("/")


def verification_link_base() -> str:
    return getattr(settings, "FRONTEND_VERIFY_EMAIL_URL", "").rstrip("/")
