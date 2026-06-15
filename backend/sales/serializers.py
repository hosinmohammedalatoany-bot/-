from rest_framework import serializers

from customers.models import Customer
from vehicles.models import Vehicle

from .models import PaymentType, PrintDocumentType, PrintLog, Reservation, SaleInvoice
from .services import create_reservation, create_sale_invoice, record_print_log, resolve_invoice_for_print


class ReservationListSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.UUIDField(source="vehicle.id", read_only=True)
    vehicle_internal_number = serializers.CharField(source="vehicle.internal_number", read_only=True)
    customer_id = serializers.UUIDField(source="customer.id", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "vehicle_id",
            "vehicle_internal_number",
            "customer_id",
            "customer_name",
            "employee_name",
            "deposit",
            "expires_at",
            "status",
            "is_active",
            "is_archived",
            "created_at",
            "updated_at",
        ]


class ReservationCreateSerializer(serializers.Serializer):
    vehicle_id = serializers.UUIDField()
    customer_id = serializers.UUIDField()
    employee_name = serializers.CharField(max_length=120)
    deposit = serializers.DecimalField(max_digits=14, decimal_places=0, min_value=0)
    expires_at = serializers.DateTimeField()

    def create(self, validated_data):
        request = self.context["request"]
        try:
            vehicle = Vehicle.objects.get(pk=validated_data["vehicle_id"], is_archived=False)
        except Vehicle.DoesNotExist:
            raise serializers.ValidationError({"vehicle_id": "السيارة غير موجودة."})
        try:
            customer = Customer.objects.get(pk=validated_data["customer_id"], is_archived=False)
        except Customer.DoesNotExist:
            raise serializers.ValidationError({"customer_id": "العميل غير موجود."})
        try:
            return create_reservation(
                user=request.user,
                vehicle=vehicle,
                customer=customer,
                employee_name=validated_data["employee_name"],
                deposit=validated_data["deposit"],
                expires_at=validated_data["expires_at"],
            )
        except ValueError as exc:
            raise serializers.ValidationError({"detail": str(exc)}) from exc


class SaleInvoiceListSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.UUIDField(source="vehicle.id", read_only=True)
    vehicle_label = serializers.SerializerMethodField()
    customer_id = serializers.UUIDField(source="customer.id", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    net_total = serializers.SerializerMethodField()

    class Meta:
        model = SaleInvoice
        fields = [
            "id",
            "document_number",
            "vehicle_id",
            "vehicle_label",
            "customer_id",
            "customer_name",
            "payment_type",
            "total",
            "discount",
            "tax",
            "net_total",
            "status",
            "discount_requires_approval",
            "discount_approved",
            "sold_with_reserved_override",
            "is_archived",
            "created_at",
        ]

    def get_vehicle_label(self, obj: SaleInvoice) -> str:
        v = obj.vehicle
        return f"{v.manufacturer} {v.model} ({v.internal_number})"

    def get_net_total(self, obj: SaleInvoice):
        return obj.net_total


class SaleInvoiceCreateSerializer(serializers.Serializer):
    vehicle_id = serializers.UUIDField()
    customer_id = serializers.UUIDField()
    payment_type = serializers.ChoiceField(choices=PaymentType.choices)
    total = serializers.DecimalField(max_digits=14, decimal_places=0, min_value=1)
    discount = serializers.DecimalField(max_digits=14, decimal_places=0, min_value=0, default=0)
    tax = serializers.DecimalField(max_digits=14, decimal_places=0, min_value=0, default=0)
    force_reserved_sale = serializers.BooleanField(default=False, required=False)
    force_discount = serializers.BooleanField(default=False, required=False)

    def create(self, validated_data):
        request = self.context["request"]
        try:
            vehicle = Vehicle.objects.get(pk=validated_data["vehicle_id"], is_archived=False)
        except Vehicle.DoesNotExist:
            raise serializers.ValidationError({"vehicle_id": "السيارة غير موجودة."})
        try:
            customer = Customer.objects.get(pk=validated_data["customer_id"], is_archived=False)
        except Customer.DoesNotExist:
            raise serializers.ValidationError({"customer_id": "العميل غير موجود."})
        try:
            return create_sale_invoice(
                user=request.user,
                vehicle=vehicle,
                customer=customer,
                payment_type=validated_data["payment_type"],
                total=validated_data["total"],
                discount=validated_data.get("discount", 0),
                tax=validated_data.get("tax", 0),
                force_reserved_sale=validated_data.get("force_reserved_sale", False),
                force_discount=validated_data.get("force_discount", False),
            )
        except ValueError as exc:
            raise serializers.ValidationError({"detail": str(exc)}) from exc


class PrintLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = PrintLog
        fields = [
            "id",
            "document_type",
            "document_number",
            "branch_name",
            "print_count",
            "printed_at",
            "actor_name",
        ]

    def get_actor_name(self, obj: PrintLog) -> str:
        if obj.actor:
            return obj.actor.full_display_name
        return "—"


class PrintLogCreateSerializer(serializers.Serializer):
    document_type = serializers.ChoiceField(choices=PrintDocumentType.choices)
    document_number = serializers.CharField(max_length=64)
    branch_name = serializers.CharField(max_length=120, required=False, allow_blank=True)

    def create(self, validated_data):
        request = self.context["request"]
        invoice = None
        if validated_data["document_type"] in (
            PrintDocumentType.INVOICE,
            PrintDocumentType.CONTRACT,
            PrintDocumentType.RECEIPT,
        ):
            invoice = resolve_invoice_for_print(validated_data["document_number"])
        branch = validated_data.get("branch_name") or ""
        if not branch.strip():
            branch = getattr(request.user, "branch", "") or "الفرع الرئيسي"
        return record_print_log(
            user=request.user,
            document_type=validated_data["document_type"],
            document_number=validated_data["document_number"].strip(),
            branch_name=branch,
            invoice=invoice,
        )
