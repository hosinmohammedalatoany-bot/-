from django.utils import timezone
from rest_framework import serializers

from accounts.models import Branch

from .models import Customer, CustomerNote, Lead, LeadNote, LeadSource, LeadStatus


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "phone",
            "email",
            "address",
            "id_number",
            "balance",
            "purchases",
            "notes",
            "branch_name",
            "is_archived",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "balance", "purchases", "is_archived", "created_at", "updated_at"]


class CustomerWriteSerializer(serializers.ModelSerializer):
    branch = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Customer
        fields = [
            "name",
            "phone",
            "email",
            "address",
            "id_number",
            "notes",
            "branch",
        ]

    def _resolve_branch(self, branch_name: str):
        name = (branch_name or "").strip()
        if not name:
            return None, ""
        branch = Branch.objects.filter(name__iexact=name, is_active=True).first()
        return branch, name

    def create(self, validated_data):
        branch_name = validated_data.pop("branch", "")
        branch, resolved_name = self._resolve_branch(branch_name)
        request = self.context.get("request")
        return Customer.objects.create(
            **validated_data,
            branch=branch,
            branch_name=resolved_name or branch_name,
            created_by=request.user if request else None,
        )

    def update(self, instance, validated_data):
        if "branch" in validated_data:
            branch_name = validated_data.pop("branch")
            branch, resolved_name = self._resolve_branch(branch_name)
            instance.branch = branch
            instance.branch_name = resolved_name or branch_name
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        return instance


class CustomerNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerNote
        fields = ["id", "body", "author_name", "created_at"]
        read_only_fields = ["id", "author_name", "created_at"]


class CustomerNoteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerNote
        fields = ["body"]

    def create(self, validated_data):
        request = self.context.get("request")
        customer = self.context["customer"]
        author = ""
        if request and request.user.is_authenticated:
            author = request.user.full_display_name
        return CustomerNote.objects.create(
            customer=customer,
            author_name=author,
            created_by=request.user if request else None,
            **validated_data,
        )


class LeadNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadNote
        fields = ["id", "body", "author_name", "created_at"]
        read_only_fields = ["id", "author_name", "created_at"]


class LeadNoteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadNote
        fields = ["body"]

    def create(self, validated_data):
        request = self.context["request"]
        lead = self.context["lead"]
        return LeadNote.objects.create(
            lead=lead,
            body=validated_data["body"],
            author_name=request.user.full_display_name,
            created_by=request.user,
        )


class LeadListSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.SerializerMethodField()
    notes_count = serializers.SerializerMethodField()

    def get_vehicle_id(self, obj: Lead) -> str | None:
        return str(obj.vehicle_id) if obj.vehicle_id else None

    class Meta:
        model = Lead
        fields = [
            "id",
            "name",
            "phone",
            "source",
            "assigned_to",
            "vehicle_id",
            "status",
            "next_follow_up",
            "note",
            "branch_name",
            "notes_count",
            "is_archived",
            "created_at",
            "updated_at",
        ]

    def get_notes_count(self, obj: Lead) -> int:
        if hasattr(obj, "notes_count"):
            return obj.notes_count
        return obj.notes.count()


class LeadDetailSerializer(LeadListSerializer):
    timeline = LeadNoteSerializer(source="notes", many=True, read_only=True)

    class Meta(LeadListSerializer.Meta):
        fields = LeadListSerializer.Meta.fields + ["timeline"]


class LeadWriteSerializer(serializers.ModelSerializer):
    branch = serializers.CharField(required=False, allow_blank=True, write_only=True)
    vehicle_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Lead
        fields = [
            "name",
            "phone",
            "source",
            "assigned_to",
            "vehicle_id",
            "status",
            "next_follow_up",
            "note",
            "branch",
        ]

    def validate_source(self, value: str) -> str:
        allowed = {c[0] for c in LeadSource.choices}
        if value not in allowed:
            raise serializers.ValidationError("مصدر العميل المحتمل غير صالح.")
        return value

    def validate_status(self, value: str) -> str:
        allowed = {c[0] for c in LeadStatus.choices}
        if value not in allowed:
            raise serializers.ValidationError("حالة العميل المحتمل غير صالحة.")
        return value

    def _resolve_branch(self, branch_name: str):
        name = (branch_name or "").strip()
        if not name:
            return None, ""
        branch = Branch.objects.filter(name__iexact=name, is_active=True).first()
        return branch, name

    def create(self, validated_data):
        from vehicles.models import Vehicle

        branch_name = validated_data.pop("branch", "")
        vehicle_id = validated_data.pop("vehicle_id", None)
        branch, resolved_name = self._resolve_branch(branch_name)
        vehicle = None
        if vehicle_id:
            vehicle = Vehicle.objects.filter(pk=vehicle_id, is_archived=False).first()
        request = self.context.get("request")
        if not validated_data.get("next_follow_up"):
            validated_data["next_follow_up"] = timezone.now()
        return Lead.objects.create(
            **validated_data,
            vehicle=vehicle,
            branch=branch,
            branch_name=resolved_name or branch_name,
            created_by=request.user if request else None,
        )

    def update(self, instance, validated_data):
        from vehicles.models import Vehicle

        if "branch" in validated_data:
            branch_name = validated_data.pop("branch")
            branch, resolved_name = self._resolve_branch(branch_name)
            instance.branch = branch
            instance.branch_name = resolved_name or branch_name
        if "vehicle_id" in validated_data:
            vehicle_id = validated_data.pop("vehicle_id")
            instance.vehicle = (
                Vehicle.objects.filter(pk=vehicle_id, is_archived=False).first()
                if vehicle_id
                else None
            )
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        return instance


class LeadStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=LeadStatus.choices)
