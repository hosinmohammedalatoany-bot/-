from rest_framework import serializers

from .models import CashTransaction, DailyCashRegister, Expense


class ExpenseSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.UUIDField(read_only=True, allow_null=True)
    sale_invoice_id = serializers.UUIDField(read_only=True, allow_null=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            "id",
            "category",
            "expense_type",
            "amount",
            "branch_name",
            "description",
            "vehicle_id",
            "sale_invoice_id",
            "created_by_name",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, obj) -> str:
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return ""


class ExpenseWriteSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.UUIDField(required=False, allow_null=True)
    sale_invoice_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = Expense
        fields = [
            "category",
            "expense_type",
            "amount",
            "branch_name",
            "description",
            "vehicle_id",
            "sale_invoice_id",
        ]

    def create(self, validated_data):
        request = self.context["request"]
        vehicle_id = validated_data.pop("vehicle_id", None)
        sale_invoice_id = validated_data.pop("sale_invoice_id", None)
        expense = Expense.objects.create(
            **validated_data,
            vehicle_id=vehicle_id,
            sale_invoice_id=sale_invoice_id,
            created_by=request.user,
        )
        return expense

    def update(self, instance, validated_data):
        if "vehicle_id" in validated_data:
            instance.vehicle_id = validated_data.pop("vehicle_id")
        if "sale_invoice_id" in validated_data:
            instance.sale_invoice_id = validated_data.pop("sale_invoice_id")
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class CashTransactionSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.UUIDField(read_only=True, allow_null=True)
    sale_invoice_id = serializers.UUIDField(read_only=True, allow_null=True)
    expense_id = serializers.UUIDField(read_only=True, allow_null=True)

    class Meta:
        model = CashTransaction
        fields = [
            "id",
            "direction",
            "amount",
            "category",
            "reference_label",
            "vehicle_id",
            "sale_invoice_id",
            "expense_id",
            "created_at",
        ]


class CashTransactionWriteSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.UUIDField(required=False, allow_null=True)
    sale_invoice_id = serializers.UUIDField(required=False, allow_null=True)
    expense_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = CashTransaction
        fields = [
            "direction",
            "amount",
            "category",
            "reference_label",
            "vehicle_id",
            "sale_invoice_id",
            "expense_id",
        ]

    def create(self, validated_data):
        register = self.context["register"]
        request = self.context["request"]
        if register.is_closed:
            raise serializers.ValidationError({"detail": "الصندوق اليومي مغلق."})
        vehicle_id = validated_data.pop("vehicle_id", None)
        sale_invoice_id = validated_data.pop("sale_invoice_id", None)
        expense_id = validated_data.pop("expense_id", None)
        return CashTransaction.objects.create(
            register=register,
            vehicle_id=vehicle_id,
            sale_invoice_id=sale_invoice_id,
            expense_id=expense_id,
            created_by=request.user,
            **validated_data,
        )


class DailyCashRegisterSerializer(serializers.ModelSerializer):
    totals = serializers.SerializerMethodField()
    transactions = CashTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = DailyCashRegister
        fields = [
            "id",
            "branch_name",
            "business_date",
            "opening_balance",
            "notes",
            "is_closed",
            "closed_at",
            "totals",
            "transactions",
            "created_at",
        ]

    def get_totals(self, obj) -> dict:
        from .services import register_cash_totals

        return register_cash_totals(obj)


class DailyCashRegisterWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyCashRegister
        fields = ["branch_name", "business_date", "opening_balance", "notes"]

    def create(self, validated_data):
        request = self.context["request"]
        return DailyCashRegister.objects.create(
            **validated_data,
            created_by=request.user,
        )
