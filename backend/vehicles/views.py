from django.db.models import Count, Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAuthenticatedActive, require_module
from accounts.roles import has_permission
from accounts.services import log_audit

from .models import Vehicle, VehicleDocument, VehicleImage, VehicleStatus
from .serializers import (
    VehicleDetailSerializer,
    VehicleDocumentCreateSerializer,
    VehicleDocumentSerializer,
    VehicleImageCreateSerializer,
    VehicleImageSerializer,
    VehicleListSerializer,
    VehicleStatusSerializer,
    VehicleWriteSerializer,
)


def _vehicle_queryset():
    return Vehicle.objects.annotate(
        image_count=Count("images", distinct=True),
        document_count=Count("documents", distinct=True),
    ).select_related("branch")


def _can_delete_vehicle(user) -> bool:
    return user.role == "admin" or user.is_superuser or has_permission(
        user.role, user.extra_permissions, "vehicle.delete"
    )


class VehicleListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("cars")]

    def get(self, request):
        qs = _vehicle_queryset()
        if request.query_params.get("archived") == "1":
            qs = qs.filter(is_archived=True)
        else:
            qs = qs.filter(is_archived=False)

        status_filter = request.query_params.get("status")
        if status_filter and status_filter != "all":
            qs = qs.filter(status=status_filter)

        branch = request.query_params.get("branch")
        if branch:
            qs = qs.filter(Q(branch_name__icontains=branch) | Q(branch__name__icontains=branch))

        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(internal_number__icontains=q)
                | Q(vin__icontains=q)
                | Q(manufacturer__icontains=q)
                | Q(model__icontains=q)
                | Q(plate_number__icontains=q)
            )

        return Response(VehicleListSerializer(qs[:500], many=True).data)

    def post(self, request):
        serializer = VehicleWriteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        vehicle = serializer.save()
        log_audit(
            action="vehicle.create",
            actor=request.user,
            target_id=str(vehicle.id),
            details=f"إضافة سيارة {vehicle.internal_number} — VIN {vehicle.vin}",
        )
        detail = VehicleDetailSerializer(vehicle).data
        return Response(detail, status=status.HTTP_201_CREATED)


class VehicleDetailView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("cars")]

    def get_object(self, vehicle_id, include_archived=False):
        qs = _vehicle_queryset()
        if not include_archived:
            qs = qs.filter(is_archived=False)
        return qs.get(pk=vehicle_id)

    def get(self, request, vehicle_id):
        try:
            vehicle = self.get_object(vehicle_id, include_archived=True)
        except Vehicle.DoesNotExist:
            return Response({"detail": "السيارة غير موجودة."}, status=404)
        return Response(VehicleDetailSerializer(vehicle).data)

    def patch(self, request, vehicle_id):
        try:
            vehicle = self.get_object(vehicle_id)
        except Vehicle.DoesNotExist:
            return Response({"detail": "السيارة غير موجودة."}, status=404)
        if vehicle.status == VehicleStatus.SOLD and not (
            request.user.role == "admin" or request.user.is_superuser
        ):
            return Response({"detail": "لا يمكن تعديل سيارة مباعة بدون صلاحية مدير."}, status=403)

        serializer = VehicleWriteSerializer(
            vehicle, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        vehicle = serializer.save()
        log_audit(
            action="vehicle.update",
            actor=request.user,
            target_id=str(vehicle.id),
            details=f"تعديل سيارة {vehicle.internal_number}",
        )
        return Response(VehicleDetailSerializer(vehicle).data)

    def delete(self, request, vehicle_id):
        if not _can_delete_vehicle(request.user):
            return Response({"detail": "غير مصرح بحذف السيارات."}, status=403)
        try:
            vehicle = self.get_object(vehicle_id)
        except Vehicle.DoesNotExist:
            return Response({"detail": "السيارة غير موجودة."}, status=404)
        vehicle.is_archived = True
        vehicle.save(update_fields=["is_archived", "updated_at"])
        log_audit(
            action="vehicle.archive",
            actor=request.user,
            target_id=str(vehicle.id),
            details=f"أرشفة سيارة {vehicle.internal_number}",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class VehicleStatusView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("cars")]

    def post(self, request, vehicle_id):
        try:
            vehicle = Vehicle.objects.get(pk=vehicle_id, is_archived=False)
        except Vehicle.DoesNotExist:
            return Response({"detail": "السيارة غير موجودة."}, status=404)

        serializer = VehicleStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]
        if vehicle.status == VehicleStatus.SOLD and new_status != VehicleStatus.SOLD:
            if not (request.user.role == "admin" or request.user.is_superuser):
                return Response({"detail": "لا يمكن تغيير حالة سيارة مباعة."}, status=403)

        vehicle.status = new_status
        vehicle.save(update_fields=["status", "updated_at"])
        log_audit(
            action="vehicle.status",
            actor=request.user,
            target_id=str(vehicle.id),
            details=f"{vehicle.internal_number} → {new_status}",
        )
        return Response(VehicleListSerializer(vehicle).data)


class VehicleImageListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("cars")]

    def get_vehicle(self, vehicle_id):
        return Vehicle.objects.get(pk=vehicle_id, is_archived=False)

    def get(self, request, vehicle_id):
        try:
            vehicle = self.get_vehicle(vehicle_id)
        except Vehicle.DoesNotExist:
            return Response({"detail": "السيارة غير موجودة."}, status=404)
        return Response(VehicleImageSerializer(vehicle.images.all(), many=True).data)

    def post(self, request, vehicle_id):
        try:
            vehicle = self.get_vehicle(vehicle_id)
        except Vehicle.DoesNotExist:
            return Response({"detail": "السيارة غير موجودة."}, status=404)
        serializer = VehicleImageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        image = serializer.save(vehicle=vehicle)
        log_audit(
            action="vehicle.image_add",
            actor=request.user,
            target_id=str(vehicle.id),
            details=f"صورة لـ {vehicle.internal_number}",
        )
        return Response(VehicleImageSerializer(image).data, status=status.HTTP_201_CREATED)


class VehicleImageDeleteView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("cars")]

    def delete(self, request, vehicle_id, image_id):
        try:
            image = VehicleImage.objects.select_related("vehicle").get(
                pk=image_id, vehicle_id=vehicle_id
            )
        except VehicleImage.DoesNotExist:
            return Response({"detail": "الصورة غير موجودة."}, status=404)
        image.delete()
        log_audit(
            action="vehicle.image_delete",
            actor=request.user,
            target_id=str(vehicle_id),
            details="حذف صورة سيارة",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class VehicleDocumentListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("cars")]

    def get_vehicle(self, vehicle_id):
        return Vehicle.objects.get(pk=vehicle_id, is_archived=False)

    def get(self, request, vehicle_id):
        try:
            vehicle = self.get_vehicle(vehicle_id)
        except Vehicle.DoesNotExist:
            return Response({"detail": "السيارة غير موجودة."}, status=404)
        return Response(VehicleDocumentSerializer(vehicle.documents.all(), many=True).data)

    def post(self, request, vehicle_id):
        try:
            vehicle = self.get_vehicle(vehicle_id)
        except Vehicle.DoesNotExist:
            return Response({"detail": "السيارة غير موجودة."}, status=404)
        serializer = VehicleDocumentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doc = serializer.save(vehicle=vehicle)
        log_audit(
            action="vehicle.document_add",
            actor=request.user,
            target_id=str(vehicle.id),
            details=f"مستند {doc.title} — {vehicle.internal_number}",
        )
        return Response(VehicleDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class VehicleDocumentDeleteView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("cars")]

    def delete(self, request, vehicle_id, document_id):
        try:
            doc = VehicleDocument.objects.get(pk=document_id, vehicle_id=vehicle_id)
        except VehicleDocument.DoesNotExist:
            return Response({"detail": "المستند غير موجود."}, status=404)
        doc.delete()
        log_audit(
            action="vehicle.document_delete",
            actor=request.user,
            target_id=str(vehicle_id),
            details="حذف مستند سيارة",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


def _public_status_for_vehicle(vehicle: Vehicle) -> str:
    if vehicle.status == VehicleStatus.SOLD:
        return "sold"
    if vehicle.status == VehicleStatus.AVAILABLE:
        return "available"
    if vehicle.status == VehicleStatus.RESERVED:
        return "reserved"
    return "unavailable"


def _public_vehicle_list_item(vehicle: Vehicle) -> dict:
    first_image = vehicle.images.order_by("sort_order", "created_at").first()
    status = _public_status_for_vehicle(vehicle)
    return {
        "id": str(vehicle.id),
        "manufacturer": vehicle.manufacturer,
        "model": vehicle.model,
        "trim": vehicle.trim,
        "year": vehicle.year,
        "exterior_color": vehicle.exterior_color,
        "fuel_type": vehicle.fuel_type,
        "transmission": vehicle.transmission,
        "mileage": vehicle.mileage,
        "branch": vehicle.branch_name,
        "status": status,
        "sale_price": str(vehicle.sale_price),
        "thumbnail": first_image.data_url if first_image else None,
    }


def _public_vehicle_detail(vehicle: Vehicle) -> dict:
    status = _public_status_for_vehicle(vehicle)
    images = [
        {
            "id": str(img.id),
            "caption": img.caption,
            "data_url": img.data_url,
        }
        for img in vehicle.images.order_by("sort_order", "created_at")
    ]
    payload = {
        "id": str(vehicle.id),
        "manufacturer": vehicle.manufacturer,
        "model": vehicle.model,
        "trim": vehicle.trim,
        "year": vehicle.year,
        "exterior_color": vehicle.exterior_color,
        "interior_color": vehicle.interior_color,
        "fuel_type": vehicle.fuel_type,
        "transmission": vehicle.transmission,
        "mileage": vehicle.mileage,
        "branch": vehicle.branch_name,
        "status": status,
        "show_sale_price": status == "available",
        "sale_price": str(vehicle.sale_price) if status == "available" else None,
        "images": images,
    }
    return payload


class VehiclePublicCatalogView(APIView):
    """Public showroom catalog — available vehicles only (no auth)."""

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        qs = (
            Vehicle.objects.filter(is_archived=False, status=VehicleStatus.AVAILABLE)
            .prefetch_related("images")
            .order_by("-created_at")
        )
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(manufacturer__icontains=q)
                | Q(model__icontains=q)
                | Q(trim__icontains=q)
                | Q(exterior_color__icontains=q)
            )
        branch = (request.query_params.get("branch") or "").strip()
        if branch:
            qs = qs.filter(branch_name__icontains=branch)
        try:
            limit = min(int(request.query_params.get("limit", "48")), 100)
        except ValueError:
            limit = 48
        vehicles = list(qs[:limit])
        return Response(
            {
                "count": len(vehicles),
                "vehicles": [_public_vehicle_list_item(v) for v in vehicles],
            }
        )


class VehiclePublicDetailView(APIView):
    """Public vehicle detail for customer showroom (no internal costs)."""

    authentication_classes = []
    permission_classes = []

    def get(self, request, vehicle_id):
        try:
            vehicle = (
                Vehicle.objects.filter(pk=vehicle_id, is_archived=False)
                .prefetch_related("images")
                .get()
            )
        except Vehicle.DoesNotExist:
            return Response({"detail": "السيارة غير موجودة."}, status=404)
        if vehicle.status != VehicleStatus.AVAILABLE:
            return Response(
                {"detail": "هذه السيارة غير معروضة للبيع حالياً."},
                status=404,
            )
        return Response(_public_vehicle_detail(vehicle))


class VehiclePublicVerifyView(APIView):
    """Public read-only vehicle summary for QR verify page (no auth)."""

    authentication_classes = []
    permission_classes = []

    def get(self, request, vehicle_id):
        try:
            vehicle = Vehicle.objects.filter(pk=vehicle_id, is_archived=False).get()
        except Vehicle.DoesNotExist:
            return Response({"detail": "السيارة غير موجودة."}, status=404)
        public_status = _public_status_for_vehicle(vehicle)
        return Response(
            {
                "id": str(vehicle.id),
                "internal_number": vehicle.internal_number,
                "manufacturer": vehicle.manufacturer,
                "model": vehicle.model,
                "year": vehicle.year,
                "exterior_color": vehicle.exterior_color,
                "status": public_status,
                "branch": vehicle.branch_name,
                "show_sale_price": public_status == "available",
                "sale_price": str(vehicle.sale_price) if public_status == "available" else None,
            }
        )
