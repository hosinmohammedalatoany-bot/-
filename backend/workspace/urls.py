from django.urls import path

from .views import (
    CustomerTimelineView,
    DashboardMetricsView,
    DocumentArchiveView,
    GlobalSearchView,
    NotificationsFeedView,
    SavedFilterDetailView,
    SavedFilterListCreateView,
)

urlpatterns = [
    path("dashboard/", DashboardMetricsView.as_view(), name="workspace-dashboard"),
    path("search/", GlobalSearchView.as_view(), name="workspace-search"),
    path("notifications/", NotificationsFeedView.as_view(), name="workspace-notifications"),
    path("documents/", DocumentArchiveView.as_view(), name="workspace-documents"),
    path(
        "customers/<uuid:customer_id>/timeline/",
        CustomerTimelineView.as_view(),
        name="workspace-customer-timeline",
    ),
    path("saved-filters/", SavedFilterListCreateView.as_view(), name="saved-filters"),
    path(
        "saved-filters/<uuid:filter_id>/",
        SavedFilterDetailView.as_view(),
        name="saved-filter-detail",
    ),
]
