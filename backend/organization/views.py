from django.db.models import Count
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Branch
from accounts.permissions import IsAuthenticatedActive, require_module
from accounts.roles import has_permission
from accounts.services import log_audit

from .models import CompanyProfile
from .serializers import BranchSerializer, CompanyProfileSerializer


class CompanyProfileView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("settings")]

    def get(self, request):
        profile = CompanyProfile.load()
        return Response(CompanyProfileSerializer(profile).data)

    def put(self, request):
        user = request.user
        if not (
            user.role == "admin"
            or user.is_superuser
            or has_permission(user.role, user.extra_permissions, "settings.manage")
        ):
            return Response({"detail": "غير مصرح بتعديل إعدادات الشركة."}, status=403)
        profile = CompanyProfile.load()
        serializer = CompanyProfileSerializer(profile, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_audit(
            action="settings.company_update",
            actor=user,
            details="تحديث بيانات الشركة وإعدادات الطباعة",
        )
        return Response(serializer.data)

    def patch(self, request):
        user = request.user
        if not (
            user.role == "admin"
            or user.is_superuser
            or has_permission(user.role, user.extra_permissions, "settings.manage")
        ):
            return Response({"detail": "غير مصرح بتعديل إعدادات الشركة."}, status=403)
        profile = CompanyProfile.load()
        serializer = CompanyProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_audit(
            action="settings.company_update",
            actor=user,
            details="تحديث جزئي لإعدادات الشركة",
        )
        return Response(serializer.data)


class BranchListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("branches")]

    def get(self, request):
        qs = Branch.objects.annotate(active_users=Count("users")).order_by("name")
        if request.query_params.get("active_only") == "1":
            qs = qs.filter(is_active=True)
        return Response(BranchSerializer(qs, many=True).data)

    def post(self, request):
        user = request.user
        if not (
            user.role == "admin"
            or user.is_superuser
            or has_permission(user.role, user.extra_permissions, "settings.manage")
        ):
            return Response({"detail": "غير مصرح بإنشاء فروع."}, status=403)
        serializer = BranchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        branch = serializer.save()
        log_audit(
            action="branches.create",
            actor=user,
            target_id=str(branch.id),
            details=f"إنشاء فرع: {branch.name}",
        )
        return Response(BranchSerializer(branch).data, status=status.HTTP_201_CREATED)


class BranchDetailView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("branches")]

    def get_object(self, branch_id):
        return Branch.objects.get(pk=branch_id)

    def get(self, request, branch_id):
        branch = self.get_object(branch_id)
        return Response(BranchSerializer(branch).data)

    def patch(self, request, branch_id):
        user = request.user
        if not (
            user.role == "admin"
            or user.is_superuser
            or has_permission(user.role, user.extra_permissions, "settings.manage")
        ):
            return Response({"detail": "غير مصرح بتعديل الفروع."}, status=403)
        branch = self.get_object(branch_id)
        serializer = BranchSerializer(branch, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_audit(
            action="branches.update",
            actor=user,
            target_id=str(branch.id),
            details=f"تعديل فرع: {branch.name}",
        )
        return Response(serializer.data)

    def delete(self, request, branch_id):
        user = request.user
        if not (user.role == "admin" or user.is_superuser):
            return Response({"detail": "حذف الفروع متاح للمدير فقط."}, status=403)
        branch = self.get_object(branch_id)
        if branch.users.exists():
            branch.is_active = False
            branch.save(update_fields=["is_active"])
            log_audit(
                action="branches.archive",
                actor=user,
                target_id=str(branch.id),
                details=f"أرشفة فرع (يوجد مستخدمون): {branch.name}",
            )
            return Response(
                {
                    "ok": True,
                    "archived": True,
                    "message": "تم تعطيل الفرع لأنه مرتبط بمستخدمين.",
                }
            )
        name = branch.name
        branch.delete()
        log_audit(
            action="branches.delete",
            actor=user,
            target_id=str(branch_id),
            details=f"حذف فرع: {name}",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
