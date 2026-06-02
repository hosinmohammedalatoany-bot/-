from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAuthenticatedActive, require_module

from .models import SavedFilter
from .services import (
    build_customer_timeline,
    build_notifications,
    compute_dashboard_metrics,
    global_search,
    list_document_archive,
    resolve_branch_scope,
)


class DashboardMetricsView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("dashboard")]

    def get(self, request):
        branch = resolve_branch_scope(
            request.user, request.query_params.get("branch_name")
        )
        return Response(compute_dashboard_metrics(branch_name=branch))


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticatedActive]

    def get(self, request):
        branch = resolve_branch_scope(
            request.user, request.query_params.get("branch_name")
        )
        limit = int(request.query_params.get("limit", 24))
        return Response(
            global_search(
                query=request.query_params.get("q", ""),
                branch_name=branch,
                limit=limit,
            )
        )


class NotificationsFeedView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("notifications")]

    def get(self, request):
        branch = resolve_branch_scope(
            request.user, request.query_params.get("branch_name")
        )
        limit = min(int(request.query_params.get("limit", 40)), 80)
        items = build_notifications(branch_name=branch, limit=limit)
        unread = sum(1 for i in items if not i.get("read"))
        return Response({"items": items, "unread_count": unread})


class DocumentArchiveView(APIView):
    permission_classes = [IsAuthenticatedActive]

    def get(self, request):
        branch = resolve_branch_scope(
            request.user, request.query_params.get("branch_name")
        )
        limit = min(int(request.query_params.get("limit", 100)), 200)
        return Response(
            {"documents": list_document_archive(branch_name=branch, limit=limit)}
        )


class CustomerTimelineView(APIView):
    permission_classes = [IsAuthenticatedActive, require_module("customers")]

    def get(self, request, customer_id):
        events = build_customer_timeline(customer_id)
        if not events:
            from customers.models import Customer

            if not Customer.objects.filter(pk=customer_id).exists():
                return Response({"detail": "العميل غير موجود."}, status=404)
        return Response({"events": events})


def _filter_to_dict(row: SavedFilter) -> dict:
    return {
        "id": str(row.id),
        "module_key": row.module_key,
        "name": row.name,
        "query": row.query,
        "is_default": row.is_default,
        "created_at": row.created_at.isoformat(),
        "updated_at": row.updated_at.isoformat(),
    }


class SavedFilterListCreateView(APIView):
    permission_classes = [IsAuthenticatedActive]

    def get(self, request):
        module_key = (request.query_params.get("module_key") or "").strip()
        qs = SavedFilter.objects.filter(owner=request.user)
        if module_key:
            qs = qs.filter(module_key=module_key)
        return Response({"filters": [_filter_to_dict(r) for r in qs]})

    def post(self, request):
        module_key = (request.data.get("module_key") or "").strip()
        name = (request.data.get("name") or "").strip()
        if not module_key or not name:
            return Response(
                {"detail": "اسم الفلتر والقسم مطلوبان."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        query = request.data.get("query")
        if query is None:
            query = {}
        if not isinstance(query, dict):
            return Response(
                {"detail": "صيغة الفلتر غير صالحة."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        is_default = bool(request.data.get("is_default"))
        if is_default:
            SavedFilter.objects.filter(
                owner=request.user, module_key=module_key
            ).update(is_default=False)
        row, created = SavedFilter.objects.update_or_create(
            owner=request.user,
            module_key=module_key,
            name=name,
            defaults={"query": query, "is_default": is_default},
        )
        return Response(
            _filter_to_dict(row),
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class SavedFilterDetailView(APIView):
    permission_classes = [IsAuthenticatedActive]

    def delete(self, request, filter_id):
        deleted, _ = SavedFilter.objects.filter(
            pk=filter_id, owner=request.user
        ).delete()
        if not deleted:
            return Response({"detail": "الفلتر غير موجود."}, status=404)
        return Response(status=status.HTTP_204_NO_CONTENT)
