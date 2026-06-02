from django.db.models import Count, Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAuthenticatedActive, require_module
from accounts.roles import has_permission
from accounts.services import log_audit

from .models import Customer, Lead, LeadNote
from .serializers import (
    CustomerSerializer,
    CustomerWriteSerializer,
    LeadDetailSerializer,
    LeadListSerializer,
    LeadNoteCreateSerializer,
    LeadNoteSerializer,
    LeadStatusSerializer,
    LeadWriteSerializer,
)


def _can_delete_customer(user) -> bool:
    return user.role == "admin" or user.is_superuser or has_permission(
        user.role, user.extra_permissions, "customer.delete"
    )


class CustomerListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("customers")]

    def get(self, request):
        qs = Customer.objects.filter(is_archived=False)
        if request.query_params.get("archived") == "1":
            qs = Customer.objects.filter(is_archived=True)

        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(phone__icontains=q)
                | Q(email__icontains=q)
                | Q(id_number__icontains=q)
            )
        return Response(CustomerSerializer(qs[:500], many=True).data)

    def post(self, request):
        serializer = CustomerWriteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()
        log_audit(
            action="customer.create",
            actor=request.user,
            target_id=str(customer.id),
            details=f"إضافة عميل {customer.name}",
        )
        return Response(CustomerSerializer(customer).data, status=status.HTTP_201_CREATED)


class CustomerDetailView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("customers")]

    def get_object(self, customer_id):
        return Customer.objects.get(pk=customer_id)

    def get(self, request, customer_id):
        try:
            customer = self.get_object(customer_id)
        except Customer.DoesNotExist:
            return Response({"detail": "العميل غير موجود."}, status=404)
        return Response(CustomerSerializer(customer).data)

    def patch(self, request, customer_id):
        try:
            customer = self.get_object(customer_id)
        except Customer.DoesNotExist:
            return Response({"detail": "العميل غير موجود."}, status=404)
        serializer = CustomerWriteSerializer(
            customer, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()
        log_audit(
            action="customer.update",
            actor=request.user,
            target_id=str(customer.id),
            details=f"تحديث عميل {customer.name}",
        )
        return Response(CustomerSerializer(customer).data)

    def delete(self, request, customer_id):
        if not _can_delete_customer(request.user):
            return Response({"detail": "غير مصرح بحذف العملاء."}, status=403)
        try:
            customer = self.get_object(customer_id)
        except Customer.DoesNotExist:
            return Response({"detail": "العميل غير موجود."}, status=404)
        customer.is_archived = True
        customer.save(update_fields=["is_archived", "updated_at"])
        log_audit(
            action="customer.archive",
            actor=request.user,
            target_id=str(customer.id),
            details=f"أرشفة عميل {customer.name}",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class LeadListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("leads")]

    def get(self, request):
        qs = Lead.objects.annotate(notes_count=Count("notes", distinct=True)).select_related(
            "vehicle"
        )
        if request.query_params.get("archived") == "1":
            qs = qs.filter(is_archived=True)
        else:
            qs = qs.filter(is_archived=False)

        status_filter = request.query_params.get("status")
        if status_filter and status_filter != "all":
            qs = qs.filter(status=status_filter)

        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(phone__icontains=q)
                | Q(source__icontains=q)
                | Q(assigned_to__icontains=q)
            )
        return Response(LeadListSerializer(qs[:500], many=True).data)

    def post(self, request):
        serializer = LeadWriteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        lead = serializer.save()
        log_audit(
            action="lead.create",
            actor=request.user,
            target_id=str(lead.id),
            details=f"إضافة عميل محتمل {lead.name}",
        )
        lead = Lead.objects.annotate(notes_count=Count("notes")).get(pk=lead.pk)
        return Response(LeadDetailSerializer(lead).data, status=status.HTTP_201_CREATED)


class LeadDetailView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("leads")]

    def get(self, request, lead_id):
        try:
            lead = (
                Lead.objects.annotate(notes_count=Count("notes"))
                .select_related("vehicle")
                .prefetch_related("notes")
                .get(pk=lead_id)
            )
        except Lead.DoesNotExist:
            return Response({"detail": "العميل المحتمل غير موجود."}, status=404)
        return Response(LeadDetailSerializer(lead).data)

    def patch(self, request, lead_id):
        try:
            lead = Lead.objects.get(pk=lead_id)
        except Lead.DoesNotExist:
            return Response({"detail": "العميل المحتمل غير موجود."}, status=404)
        serializer = LeadWriteSerializer(
            lead, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        lead = serializer.save()
        log_audit(
            action="lead.update",
            actor=request.user,
            target_id=str(lead.id),
            details=f"تحديث عميل محتمل {lead.name}",
        )
        lead = Lead.objects.annotate(notes_count=Count("notes")).prefetch_related("notes").get(
            pk=lead.pk
        )
        return Response(LeadDetailSerializer(lead).data)

    def delete(self, request, lead_id):
        if not (
            request.user.role == "admin"
            or request.user.is_superuser
            or has_permission(request.user.role, request.user.extra_permissions, "lead.delete")
        ):
            return Response({"detail": "غير مصرح بحذف العملاء المحتملين."}, status=403)
        try:
            lead = Lead.objects.get(pk=lead_id)
        except Lead.DoesNotExist:
            return Response({"detail": "العميل المحتمل غير موجود."}, status=404)
        lead.is_archived = True
        lead.save(update_fields=["is_archived", "updated_at"])
        log_audit(
            action="lead.archive",
            actor=request.user,
            target_id=str(lead.id),
            details=f"أرشفة عميل محتمل {lead.name}",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class LeadStatusView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("leads")]

    def post(self, request, lead_id):
        try:
            lead = Lead.objects.get(pk=lead_id, is_archived=False)
        except Lead.DoesNotExist:
            return Response({"detail": "العميل المحتمل غير موجود."}, status=404)
        serializer = LeadStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lead.status = serializer.validated_data["status"]
        lead.save(update_fields=["status", "updated_at"])
        log_audit(
            action="lead.status",
            actor=request.user,
            target_id=str(lead.id),
            details=f"تغيير حالة {lead.name} إلى {lead.status}",
        )
        return Response(LeadListSerializer(lead).data)


class LeadNoteListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("leads")]

    def get(self, request, lead_id):
        try:
            lead = Lead.objects.get(pk=lead_id)
        except Lead.DoesNotExist:
            return Response({"detail": "العميل المحتمل غير موجود."}, status=404)
        notes = lead.notes.all()[:100]
        return Response(LeadNoteSerializer(notes, many=True).data)

    def post(self, request, lead_id):
        try:
            lead = Lead.objects.get(pk=lead_id, is_archived=False)
        except Lead.DoesNotExist:
            return Response({"detail": "العميل المحتمل غير موجود."}, status=404)
        serializer = LeadNoteCreateSerializer(
            data=request.data, context={"request": request, "lead": lead}
        )
        serializer.is_valid(raise_exception=True)
        note = serializer.save()
        log_audit(
            action="lead.note",
            actor=request.user,
            target_id=str(lead.id),
            details=f"ملاحظة متابعة لـ {lead.name}",
        )
        return Response(LeadNoteSerializer(note).data, status=status.HTTP_201_CREATED)
