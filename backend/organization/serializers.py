import re
import unicodedata

from rest_framework import serializers

from accounts.models import Branch

from .models import CompanyProfile


def _slug_code(name: str) -> str:
    base = unicodedata.normalize("NFKD", name)
    base = re.sub(r"[^\w\s-]", "", base, flags=re.UNICODE)
    base = re.sub(r"[\s_-]+", "-", base.strip().lower())
    base = base[:28] or "branch"
    return base


class CompanyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyProfile
        fields = [
            "company_name",
            "address",
            "phone",
            "email",
            "commercial_register",
            "tax_number",
            "currency",
            "invoice_footer",
            "contract_legal_text",
            "print_margin_mm",
            "paper_size",
            "manager_name",
            "manager_title",
            "show_qr",
            "show_barcode",
            "show_stamp",
            "show_manager_signature",
            "show_client_signature",
            "logo_data_url",
            "stamp_data_url",
            "signature_data_url",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def validate_currency(self, value: str) -> str:
        v = (value or "IQD").strip().upper()
        if len(v) < 3 or len(v) > 8:
            raise serializers.ValidationError("رمز العملة غير صالح.")
        return v

    def validate_paper_size(self, value: str) -> str:
        v = (value or "A4").strip()
        if v not in ("A4", "Letter"):
            raise serializers.ValidationError("حجم الورق يجب أن يكون A4 أو Letter.")
        return v

    def validate_print_margin_mm(self, value: int) -> int:
        if value < 4 or value > 40:
            raise serializers.ValidationError("هامش الطباعة يجب أن يكون بين 4 و 40 مم.")
        return value


class BranchSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = [
            "id",
            "name",
            "code",
            "address",
            "phone",
            "manager_name",
            "is_active",
            "user_count",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "user_count"]

    def get_user_count(self, obj: Branch) -> int:
        return obj.users.filter(status="active").count()

    def validate_name(self, value: str) -> str:
        name = value.strip()
        if len(name) < 2:
            raise serializers.ValidationError("اسم الفرع قصير جداً.")
        return name

    def validate_code(self, value: str) -> str:
        code = (value or "").strip().lower()
        if not code:
            return code
        if not re.match(r"^[a-z0-9][a-z0-9-]{0,30}$", code):
            raise serializers.ValidationError("رمز الفرع: أحرف إنجليزية صغيرة وأرقام وشرطة فقط.")
        return code

    def create(self, validated_data):
        if not validated_data.get("code"):
            name = validated_data["name"]
            base = _slug_code(name)
            code = base
            n = 1
            while Branch.objects.filter(code=code).exists():
                n += 1
                code = f"{base}-{n}"
            validated_data["code"] = code
        return super().create(validated_data)
