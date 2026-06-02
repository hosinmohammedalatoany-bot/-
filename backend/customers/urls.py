from django.urls import path

from .views import (
    CustomerDetailView,
    CustomerListCreateView,
    CustomerNoteListCreateView,
)

urlpatterns = [
    path("", CustomerListCreateView.as_view(), name="customer-list"),
    path("<uuid:customer_id>/", CustomerDetailView.as_view(), name="customer-detail"),
    path(
        "<uuid:customer_id>/notes/",
        CustomerNoteListCreateView.as_view(),
        name="customer-notes",
    ),
]
