from django.urls import path

from .views import (
    VehicleDetailView,
    VehicleDocumentDeleteView,
    VehicleDocumentListCreateView,
    VehicleImageDeleteView,
    VehicleImageListCreateView,
    VehicleListCreateView,
    VehiclePublicCatalogView,
    VehiclePublicDetailView,
    VehiclePublicVerifyView,
    VehicleStatusView,
)

urlpatterns = [
    path("public/", VehiclePublicCatalogView.as_view(), name="vehicle-public-catalog"),
    path(
        "public/<uuid:vehicle_id>/",
        VehiclePublicDetailView.as_view(),
        name="vehicle-public-detail",
    ),
    path("", VehicleListCreateView.as_view(), name="vehicle-list"),
    path("<uuid:vehicle_id>/", VehicleDetailView.as_view(), name="vehicle-detail"),
    path("<uuid:vehicle_id>/status/", VehicleStatusView.as_view(), name="vehicle-status"),
    path("<uuid:vehicle_id>/images/", VehicleImageListCreateView.as_view(), name="vehicle-images"),
    path(
        "<uuid:vehicle_id>/images/<uuid:image_id>/",
        VehicleImageDeleteView.as_view(),
        name="vehicle-image-delete",
    ),
    path(
        "<uuid:vehicle_id>/documents/",
        VehicleDocumentListCreateView.as_view(),
        name="vehicle-documents",
    ),
    path(
        "<uuid:vehicle_id>/documents/<uuid:document_id>/",
        VehicleDocumentDeleteView.as_view(),
        name="vehicle-document-delete",
    ),
    path(
        "verify/<uuid:vehicle_id>/",
        VehiclePublicVerifyView.as_view(),
        name="vehicle-public-verify",
    ),
]
