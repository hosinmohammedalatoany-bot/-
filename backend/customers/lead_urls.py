from django.urls import path

from .views import (
    LeadDetailView,
    LeadListCreateView,
    LeadNoteListCreateView,
    LeadStatusView,
)

urlpatterns = [
    path("", LeadListCreateView.as_view(), name="lead-list"),
    path("<uuid:lead_id>/", LeadDetailView.as_view(), name="lead-detail"),
    path("<uuid:lead_id>/status/", LeadStatusView.as_view(), name="lead-status"),
    path("<uuid:lead_id>/notes/", LeadNoteListCreateView.as_view(), name="lead-notes"),
]
