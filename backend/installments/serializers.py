from decimal import Decimal

from rest_framework import serializers

from customers.models import Customer
from sales.models import SaleInvoice
from vehicles.models import Vehicle

from .models import InstallmentContract, InstallmentPayment, InstallmentScheduleEntry
from .services import create_installment_contract, delete_installment_payment, record_installment_payment


class ScheduleEntrySerializer(serializers.ModelSerializer):
    customer_id = serializers.UUIDField(source="contract.customer_id", read_only=True)
    vehicle_id = serializers.UUIDField(source="contract.vehicle_id", read_only=True)
    contract_number = serializers.CharField(source="contract.contract_number", read_only=True)

    class Meta:
        model = InstallmentScheduleEntry
        fields = [
            "id",
            "contract_id",
            "contract_number",
            "customer_id",
            "vehicle_id",
            "sequence",
            "due_date",
            "amount",
            "paid_amount",
            "status",
        ]


class InstallmentContractListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    vehicle_label = serializers.SerializerMethodField()
    sale_invoice_number = serializers.CharField(
        source="sale_invoice.document_number", read_only=True, allow_null=True
    )

    class Meta:
        model = InstallmentContract
        fields = [
            "id",
            "contract_number",
            "customer_id",
            "customer_name",
            "vehicle_id",
            "vehicle_label",
            "sale_invoice_id",
            "sale_invoice_number",
            "total_amount",
            "down_payment",
            "installment_count",
            "branch_name",
            "start_date",
            "status",
            "created_at",
        ]

    def get_vehicle_label(self, obj: InstallmentContract) -> str:
        v = obj.vehicle
        return f"{v.manufacturer} {v.model} ({v.internal_number})"


class InstallmentContractCreateSerializer(serializers.Serializer):
    customer_id = serializers.UUIDField()
    vehicle_id = serializers.UUIDField()
    sale_invoice_id = serializers.UUIDField(required=False, allow_null=True)
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=0, min_value=Decimal("1"))
    down_payment = serializers.DecimalField(
        max_digits=14, decimal_places=0, min_value=Decimal("0"), default=Decimal("0")
    )
    installment_count = serializers.IntegerField(min_value=1, max_value=120)
    start_date = serializers.DateField()
    interval_days = serializers.IntegerField(min_value=7, max_value=365, default=30)
    branch_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        try:
            attrs["customer"] = Customer.objects.get(
                pk=attrs["customer_id"], is_archived=False
            )
        except Customer.DoesNotExist as exc:
            raise serializers.ValidationError(
                {"customer_id": "العميل غير موجود."}
            ) from exc
        try:
            attrs["vehicle"] = Vehicle.objects.get(
                pk=attrs["vehicle_id"], is_archived=False
            )
        except Vehicle.DoesNotExist as exc:
            raise serializers.ValidationError(
                {"vehicle_id": "السيارة غير موجودة."}
            ) from exc
        sale_invoice = None
        sale_id = attrs.get("sale_invoice_id")
        if sale_id:
            try:
                sale_invoice = SaleInvoice.objects.get(pk=sale_id, is_archived=False)
            except SaleInvoice.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {"sale_invoice_id": "الفاتورة غير موجودة."}
                ) from exc
        attrs["sale_invoice"] = sale_invoice
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        return create_installment_contract(
            user=request.user,
            customer=validated_data["customer"],
            vehicle=validated_data["vehicle"],
            total_amount=validated_data["total_amount"],
            down_payment=validated_data.get("down_payment", Decimal("0")),
            installment_count=validated_data["installment_count"],
            start_date=validated_data["start_date"],
            branch_name=validated_data.get("branch_name", ""),
            sale_invoice=validated_data.get("sale_invoice"),
            interval_days=validated_data.get("interval_days", 30),
            notes=validated_data.get("notes", ""),
        )


class InstallmentPaymentSerializer(serializers.ModelSerializer):
    schedule_entry_id = serializers.UUIDField(source="schedule_entry.id", read_only=True)
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = InstallmentPayment
        fields = [
            "id",
            "schedule_entry_id",
            "amount",
            "payment_date",
            "receipt_reference",
            "sale_invoice_id",
            "notes",
            "actor_name",
            "created_at",
        ]

    def get_actor_name(self, obj: InstallmentPayment) -> str:
        if obj.recorded_by:
            return obj.recorded_by.full_display_name
        return "—"


class InstallmentPaymentCreateSerializer(serializers.Serializer):
    schedule_entry_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=0, min_value=Decimal("1"))
    payment_date = serializers.DateField(required=False)
    receipt_reference = serializers.CharField(max_length=64, required=False, allow_blank=True)
    sale_invoice_id = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        try:
            entry = InstallmentScheduleEntry.objects.select_related("contract").get(
                pk=attrs["schedule_entry_id"]
            )
        except InstallmentScheduleEntry.DoesNotExist as exc:
            raise serializers.ValidationError(
                {"schedule_entry_id": "قسط الجدول غير موجود."}
            ) from exc
        attrs["schedule_entry"] = entry
        sale_invoice = None
        inv_id = attrs.get("sale_invoice_id")
        if inv_id:
            try:
                sale_invoice = SaleInvoice.objects.get(pk=inv_id, is_archived=False)
            except SaleInvoice.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {"sale_invoice_id": "الفاتورة غير موجودة."}
                ) from exc
        attrs["sale_invoice"] = sale_invoice
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        try:
            return record_installment_payment(
                user=request.user,
                schedule_entry=validated_data["schedule_entry"],
                amount=validated_data["amount"],
                payment_date=validated_data.get("payment_date"),
                receipt_reference=validated_data.get("receipt_reference", ""),
                sale_invoice=validated_data.get("sale_invoice"),
                notes=validated_data.get("notes", ""),
            )
        except ValueError as exc:
            raise serializers.ValidationError({"detail": str(exc)}) from exc
