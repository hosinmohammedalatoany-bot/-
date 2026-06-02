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


class VehiclePublicVerifyView(APIView):
    """Public read-only vehicle summary for QR verify page (no auth)."""

    authentication_classes = []
    permission_classes = []

    def get(self, request, vehicle_id):
        try:
            vehicle = Vehicle.objects.filter(pk=vehicle_id, is_archived=False).get()
        except Vehicle.DoesNotExist:
            return Response({"detail": "السيارة غير موجودة."}, status=404)
        if vehicle.status == VehicleStatus.SOLD:
            public_status = "sold"
        elif vehicle.status in (VehicleStatus.AVAILABLE, VehicleStatus.RESERVED):
            public_status = vehicle.status
        else:
            public_status = "unavailable"
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
