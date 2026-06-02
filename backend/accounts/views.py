import os

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import (
    EmailVerificationToken,
    PasswordResetToken,
    ShowroomUser,
    UserSession,
    UserStatus,
)
from .permissions import IsAdmin, IsAuthenticatedActive
from .roles import ROLE_ADMIN, has_module_access, has_permission
from .serializers import (
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    PermissionCheckSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    SetupAdminSerializer,
    UserSerializer,
)
from .services import (
    create_email_verification,
    create_password_reset,
    log_audit,
    user_payload,
    verification_link_base,
)


def _client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _device_label(request) -> str:
    ua = request.META.get("HTTP_USER_AGENT", "")[:200]
    return ua or "unknown"


def issue_tokens(user: ShowroomUser, request) -> dict:
    refresh = RefreshToken.for_user(user)
    jti = str(refresh.get("jti", ""))
    UserSession.objects.create(
        user=user,
        device_label=_device_label(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
        ip_address=_client_ip(request),
        refresh_jti=jti,
    )
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


class SetupStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        has_admin = ShowroomUser.objects.filter(role=ROLE_ADMIN).exists()
        return Response(
            {
                "setup_completed": has_admin,
                "registration_open": getattr(settings, "REGISTRATION_OPEN", True),
            }
        )


class SetupAdminView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SetupAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        from .models import Branch

        branch_name = data.get("branch", "").strip() or "الفرع الرئيسي"
        branch, _ = Branch.objects.get_or_create(
            name=branch_name,
            defaults={"code": "main"},
        )
        parts = data["name"].strip().split(maxsplit=1)
        user = ShowroomUser.objects.create_user(
            email=data["email"].strip().lower(),
            password=data["password"],
            first_name=parts[0] if parts else data["email"],
            last_name=parts[1] if len(parts) > 1 else "",
            phone=data.get("phone", ""),
            role=ROLE_ADMIN,
            branch=branch,
            status=UserStatus.ACTIVE,
            email_verified=True,
            is_staff=True,
            is_superuser=True,
        )
        log_audit(
            action="auth.setup",
            actor=user,
            details="إعداد المدير الأول للنظام",
        )
        tokens = issue_tokens(user, request)
        return Response(
            {
                "ok": True,
                "user": user_payload(user),
                **tokens,
            },
            status=status.HTTP_201_CREATED,
        )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not getattr(settings, "REGISTRATION_OPEN", True):
            return Response(
                {"detail": "التسجيل مغلق حالياً."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not ShowroomUser.objects.filter(role=ROLE_ADMIN).exists():
            return Response(
                {"detail": "يجب إعداد المدير الأول أولاً.", "needs_setup": True},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        verification = create_email_verification(user)
        log_audit(
            action="auth.register",
            actor=user,
            target_id=str(user.id),
            target_email=user.email,
            details=f"تسجيل حساب جديد — الدور: {user.role}",
        )
        payload = {
            "ok": True,
            "message": "تم إنشاء الحساب. بانتظار موافقة المدير بعد التحقق من البريد.",
            "user": user_payload(user),
        }
        if settings.DEBUG or os.environ.get("VERIFY_EMAIL_IN_RESPONSE", "").lower() in (
            "1",
            "true",
            "yes",
        ):
            base = verification_link_base() or request.build_absolute_uri("/verify-email")
            payload["verification_url"] = f"{base}?token={verification.token}"
        return Response(payload, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not ShowroomUser.objects.filter(role=ROLE_ADMIN).exists():
            return Response(
                {"detail": "يجب إعداد المدير الأول أولاً.", "needs_setup": True},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        tokens = issue_tokens(user, request)
        log_audit(action="auth.login", actor=user, details="تسجيل دخول JWT")
        return Response(
            {
                "ok": True,
                "must_change_password": user.must_change_password,
                "user": user_payload(user),
                **tokens,
            }
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_raw = request.data.get("refresh")
        if refresh_raw:
            try:
                token = RefreshToken(refresh_raw)
                token.blacklist()
            except Exception:  # noqa: BLE001
                pass
        UserSession.objects.filter(user=request.user, is_active=True).update(
            is_active=False
        )
        log_audit(action="auth.logout", actor=request.user, details="تسجيل خروج")
        return Response({"ok": True})


class LogoutAllView(APIView):
    permission_classes = [IsAuthenticatedActive]

    def post(self, request):
        UserSession.objects.filter(user=request.user).update(is_active=False)
        log_audit(
            action="auth.logout-all",
            actor=request.user,
            details="تسجيل خروج من جميع الأجهزة",
        )
        return Response(
            {
                "ok": True,
                "message": "تم إنهاء الجلسات. أعد تسجيل الدخول على الأجهزة الأخرى.",
            }
        )


class MeView(APIView):
    permission_classes = [IsAuthenticatedActive]

    def get(self, request):
        return Response({"user": user_payload(request.user)})


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        user = ShowroomUser.objects.filter(email=email).first()
        payload = {"ok": True, "message": "إذا كان البريد مسجلاً ستصلك تعليمات الاستعادة."}
        if user and user.status == UserStatus.ACTIVE:
            reset = create_password_reset(user)
            log_audit(
                action="auth.forgot-password",
                target_email=email,
                details="طلب استعادة كلمة مرور",
            )
            if settings.DEBUG or os.environ.get("VERIFY_EMAIL_IN_RESPONSE", "").lower() in (
                "1",
                "true",
                "yes",
            ):
                base = os.environ.get(
                    "FRONTEND_PASSWORD_RESET_URL",
                    request.build_absolute_uri("/reset-password"),
                )
                payload["reset_url"] = f"{base.rstrip('/')}?token={reset.token}"
        return Response(payload)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token_value = serializer.validated_data["token"]
        reset = (
            PasswordResetToken.objects.select_related("user")
            .filter(token=token_value, used=False)
            .first()
        )
        if not reset or reset.expires_at < timezone.now():
            return Response(
                {"detail": "رمز الاستعادة غير صالح أو منتهي."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = reset.user
        user.set_password(serializer.validated_data["password"])
        user.must_change_password = False
        user.save()
        reset.used = True
        reset.save(update_fields=["used"])
        PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
        log_audit(
            action="auth.reset-password",
            actor=user,
            details="إعادة تعيين كلمة المرور",
        )
        return Response({"ok": True, "message": "تم تحديث كلمة المرور."})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticatedActive]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["current_password"]):
            return Response(
                {"detail": "كلمة المرور الحالية غير صحيحة."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(serializer.validated_data["new_password"])
        user.must_change_password = False
        user.save()
        log_audit(action="auth.change-password", actor=user, details="تغيير كلمة المرور")
        return Response({"ok": True})


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_value = request.data.get("token", "").strip()
        if not token_value:
            return Response({"detail": "الرمز مطلوب."}, status=400)
        record = (
            EmailVerificationToken.objects.select_related("user")
            .filter(token=token_value, used=False)
            .first()
        )
        if not record or record.expires_at < timezone.now():
            return Response({"detail": "رمز التحقق غير صالح."}, status=400)
        user = record.user
        user.email_verified = True
        user.save(update_fields=["email_verified"])
        record.used = True
        record.save(update_fields=["used"])
        log_audit(action="auth.verify-email", actor=user, details="تحقق البريد")
        return Response({"ok": True, "email_verified": True})


class PermissionCheckView(APIView):
    permission_classes = [IsAuthenticatedActive]

    def post(self, request):
        serializer = PermissionCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        perm = serializer.validated_data.get("permission", "").strip()
        module = serializer.validated_data.get("module", "").strip()
        allowed = True
        if perm:
            allowed = has_permission(user.role, user.extra_permissions, perm)
        elif module:
            allowed = has_module_access(user.role, user.extra_permissions, module)
        return Response({"allowed": allowed})


class SessionsListView(APIView):
    permission_classes = [IsAuthenticatedActive]

    def get(self, request):
        sessions = UserSession.objects.filter(user=request.user).order_by("-last_seen_at")[
            :20
        ]
        return Response(
            {
                "sessions": [
                    {
                        "id": str(s.id),
                        "device_label": s.device_label,
                        "ip_address": s.ip_address,
                        "is_active": s.is_active,
                        "last_seen_at": s.last_seen_at.isoformat(),
                        "created_at": s.created_at.isoformat(),
                    }
                    for s in sessions
                ]
            }
        )


class PendingUsersView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        users = ShowroomUser.objects.filter(status=UserStatus.PENDING).select_related(
            "branch"
        )
        return Response({"users": UserSerializer(users, many=True).data})

    def post(self, request):
        user_id = request.data.get("user_id")
        action = request.data.get("action")
        try:
            target = ShowroomUser.objects.get(id=user_id)
        except ShowroomUser.DoesNotExist:
            return Response({"detail": "المستخدم غير موجود."}, status=404)
        if action == "approve":
            target.status = UserStatus.ACTIVE
            target.approved_at = timezone.now()
            target.approved_by = request.user
            target.save()
            log_audit(
                action="auth.approve-user",
                actor=request.user,
                target_id=str(target.id),
                target_email=target.email,
                details="موافقة على حساب",
            )
            return Response({"ok": True, "status": target.status})
        if action == "reject":
            target.status = UserStatus.REJECTED
            target.save(update_fields=["status"])
            log_audit(
                action="auth.reject-user",
                actor=request.user,
                target_id=str(target.id),
                details="رفض حساب",
            )
            return Response({"ok": True, "status": target.status})
        return Response({"detail": "إجراء غير معروف."}, status=400)
