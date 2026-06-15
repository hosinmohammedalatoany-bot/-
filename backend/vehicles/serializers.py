import re

from rest_framework import serializers

from accounts.models import Branch

from .models import Vehicle, VehicleDocument, VehicleImage, VehicleStatus


def _normalize_vin(value: str) -> str:
    vin = re.sub(r"\s+", "", (value or "").strip().upper())
    if len(vin) < 11 or len(vin) > 17:
        raise serializers.ValidationError("رقم VIN يجب أن يكون بين 11 و 17 حرفاً.")
    if not re.match(r"^[A-HJ-NPR-Z0-9]+$", vin):
        raise serializers.ValidationError("رقم VIN يحتوي على أحرف غير مسموحة.")
    return vin


class VehicleImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleImage
        fields = ["id", "caption", "data_url", "sort_order", "created_at"]
        read_only_fields = ["id", "created_at"]


class VehicleDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleDocument
        fields = ["id", "title", "doc_type", "data_url", "file_name", "created_at"]
        read_only_fields = ["id", "created_at"]


class VehicleListSerializer(serializers.ModelSerializer):
    photos = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()
    branch = serializers.CharField(source="branch_name", read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            "id",
            "internal_number",
            "vin",
            "plate_number",
            "manufacturer",
            "model",
            "trim",
            "year",
            "exterior_color",
            "interior_color",
            "fuel_type",
            "transmission",
            "mileage",
            "purchase_price",
            "sale_price",
            "minimum_sale_price",
            "maintenance_cost",
            "transportation_cost",
            "status",
            "branch",
            "supplier",
            "notes",
            "photos",
            "documents",
            "is_archived",
            "created_at",
            "updated_at",
        ]

    def get_photos(self, obj: Vehicle) -> int:
        if hasattr(obj, "image_count"):
            return obj.image_count
        return obj.images.count()

    def get_documents(self, obj: Vehicle) -> int:
        if hasattr(obj, "document_count"):
            return obj.document_count
        return obj.documents.count()


class VehicleDetailSerializer(VehicleListSerializer):
    images = VehicleImageSerializer(many=True, read_only=True)
    document_items = VehicleDocumentSerializer(source="documents", many=True, read_only=True)

    class Meta(VehicleListSerializer.Meta):
        fields = VehicleListSerializer.Meta.fields + ["images", "document_items"]


class VehicleWriteSerializer(serializers.ModelSerializer):
    branch = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Vehicle
        fields = [
            "internal_number",
            "vin",
            "plate_number",
            "manufacturer",
            "model",
            "trim",
            "year",
            "exterior_color",
            "interior_color",
            "fuel_type",
            "transmission",
            "mileage",
            "purchase_price",
            "sale_price",
            "minimum_sale_price",
            "maintenance_cost",
            "transportation_cost",
            "status",
            "branch",
            "supplier",
            "notes",
        ]

    def validate_vin(self, value: str) -> str:
        vin = _normalize_vin(value)
        qs = Vehicle.objects.filter(vin__iexact=vin, is_archived=False)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("رقم VIN مسجّل مسبقاً لسيارة أخرى.")
        return vin

    def validate_internal_number(self, value: str) -> str:
        num = value.strip()
        if len(num) < 2:
            raise serializers.ValidationError("الرقم الداخلي مطلوب.")
        qs = Vehicle.objects.filter(internal_number__iexact=num, is_archived=False)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("الرقم الداخلي مكرر.")
        return num

    def validate_status(self, value: str) -> str:
        if value not in VehicleStatus.values:
            raise serializers.ValidationError("حالة السيارة غير صالحة.")
        return value

    def _resolve_branch(self, branch_name: str):
        name = (branch_name or "").strip()
        if not name:
            return None, ""
        branch = Branch.objects.filter(name__iexact=name, is_active=True).first()
        if branch:
            return branch, branch.name
        return None, name

    def create(self, validated_data):
        branch_label = validated_data.pop("branch", "")
        branch_obj, branch_name = self._resolve_branch(branch_label)
        validated_data["branch"] = branch_obj
        validated_data["branch_name"] = branch_name or (branch_obj.name if branch_obj else "")
        if validated_data.get("status") is None:
            validated_data["status"] = VehicleStatus.AVAILABLE
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "branch" in validated_data:
            branch_label = validated_data.pop("branch")
            branch_obj, branch_name = self._resolve_branch(branch_label)
            validated_data["branch"] = branch_obj
            validated_data["branch_name"] = branch_name or (branch_obj.name if branch_obj else "")
        return super().update(instance, validated_data)


class VehicleStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=VehicleStatus.choices)


class VehicleImageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleImage
        fields = ["caption", "data_url", "sort_order"]

    def validate_data_url(self, value: str) -> str:
        v = (value or "").strip()
        if len(v) < 32:
            raise serializers.ValidationError("صورة غير صالحة.")
        return v


class VehicleDocumentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleDocument
        fields = ["title", "doc_type", "data_url", "file_name"]
