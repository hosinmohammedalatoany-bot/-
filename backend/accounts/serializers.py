from datetime import timedelta

from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import serializers

from .models import Branch, ShowroomUser, UserStatus
from .roles import REGISTERABLE_ROLES, ROLE_ADMIN, effective_permissions
from .services import is_strong_password, user_payload


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ("id", "name", "code", "address", "phone", "manager_name", "is_active")


class UserSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    branch_name = serializers.CharField(source="branch.name", read_only=True)

    class Meta:
        model = ShowroomUser
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "branch",
            "branch_name",
            "status",
            "email_verified",
            "permissions",
            "must_change_password",
            "date_joined",
            "last_login",
        )
        read_only_fields = (
            "id",
            "status",
            "email_verified",
            "permissions",
            "date_joined",
            "last_login",
        )

    def get_permissions(self, obj: ShowroomUser) -> list[str]:
        return effective_permissions(obj.role, obj.extra_permissions)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    name = serializers.CharField(max_length=120)
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=[(r, r) for r in sorted(REGISTERABLE_ROLES)]
    )
    branch = serializers.CharField(max_length=120, required=False, allow_blank=True)
    accept_terms = serializers.BooleanField()

    def validate_email(self, value: str) -> str:
        email = value.strip().lower()
        if ShowroomUser.objects.filter(email=email).exists():
            raise serializers.ValidationError("البريد الإلكتروني مسجل مسبقاً.")
        return email

    def validate(self, attrs):
        if not attrs.get("accept_terms"):
            raise serializers.ValidationError(
                {"accept_terms": "يجب الموافقة على الشروط."}
            )
        if not is_strong_password(attrs["password"]):
            raise serializers.ValidationError(
                {
                    "password": "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي حرفاً كبيراً وصغيراً ورقماً."
                }
            )
        return attrs

    def create(self, validated_data):
        branch_name = validated_data.get("branch", "").strip() or "الفرع الرئيسي"
        branch, _ = Branch.objects.get_or_create(
            name=branch_name,
            defaults={"code": branch_name[:32].replace(" ", "-")},
        )
        parts = validated_data["name"].strip().split(maxsplit=1)
        first = parts[0] if parts else validated_data["email"]
        last = parts[1] if len(parts) > 1 else ""
        user = ShowroomUser.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=first,
            last_name=last,
            phone=validated_data.get("phone", ""),
            role=validated_data["role"],
            branch=branch,
            status=UserStatus.PENDING,
            email_verified=False,
            terms_accepted_at=timezone.now(),
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        password = attrs["password"]
        try:
            user = ShowroomUser.objects.get(email=email)
        except ShowroomUser.DoesNotExist:
            raise serializers.ValidationError(
                {"detail": "البريد الإلكتروني أو كلمة المرور غير صحيحة."}
            ) from None

        if user.locked_until and user.locked_until > timezone.now():
            raise serializers.ValidationError(
                {"detail": "الحساب مقفل مؤقتاً بسبب محاولات فاشلة."}
            )

        auth_user = authenticate(
            request=self.context.get("request"),
            email=email,
            password=password,
        )
        if not auth_user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = timezone.now() + timedelta(minutes=15)
            user.save(update_fields=["failed_login_attempts", "locked_until"])
            raise serializers.ValidationError(
                {"detail": "البريد الإلكتروني أو كلمة المرور غير صحيحة."}
            )

        if user.status != UserStatus.ACTIVE:
            messages = {
                UserStatus.PENDING: "حسابك بانتظار موافقة المدير.",
                UserStatus.DISABLED: "تم تعطيل هذا الحساب.",
                UserStatus.REJECTED: "تم رفض طلب إنشاء الحساب.",
                UserStatus.SUSPENDED: "الحساب موقوف مؤقتاً.",
            }
            raise serializers.ValidationError(
                {"detail": messages.get(user.status, "لا يمكن تسجيل الدخول."), "status": user.status}
            )

        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login = timezone.now()
        user.save(update_fields=["failed_login_attempts", "locked_until", "last_login"])
        attrs["user"] = user
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_password(self, value: str) -> str:
        if not is_strong_password(value):
            raise serializers.ValidationError(
                "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي حرفاً كبيراً وصغيراً ورقماً."
            )
        return value


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value: str) -> str:
        if not is_strong_password(value):
            raise serializers.ValidationError(
                "كلمة المرور الجديدة لا تستوفي متطلبات الأمان."
            )
        return value


class SetupAdminSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    name = serializers.CharField(max_length=120)
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    branch = serializers.CharField(max_length=120, required=False, allow_blank=True)

    def validate(self, attrs):
        if ShowroomUser.objects.filter(role=ROLE_ADMIN).exists():
            raise serializers.ValidationError(
                {"detail": "تم إعداد النظام مسبقاً."}
            )
        if not is_strong_password(attrs["password"]):
            raise serializers.ValidationError(
                {"password": "كلمة المرور ضعيفة."}
            )
        return attrs


class PermissionCheckSerializer(serializers.Serializer):
    permission = serializers.CharField(required=False, allow_blank=True)
    module = serializers.CharField(required=False, allow_blank=True)
