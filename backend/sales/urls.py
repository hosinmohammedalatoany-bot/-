from django.urls import path

from .views import (
    InvoicePublicVerifyView,
    InvoiceRevisionListView,
    PrintLogListCreateView,
    ReservationDetailView,
    ReservationListCreateView,
    SaleInvoiceDetailView,
    SaleInvoiceListCreateView,
)

urlpatterns = [
    path("reservations/", ReservationListCreateView.as_view(), name="reservations-list"),
    path(
        "reservations/<uuid:reservation_id>/",
        ReservationDetailView.as_view(),
        name="reservations-detail",
    ),
    path("invoices/", SaleInvoiceListCreateView.as_view(), name="sales-invoices-list"),
    path(
        "invoices/verify/<str:document_number>/",
        InvoicePublicVerifyView.as_view(),
        name="sales-invoice-public-verify",
    ),
    path(
        "invoices/<uuid:invoice_id>/revisions/",
        InvoiceRevisionListView.as_view(),
        name="sales-invoice-revisions",
    ),
    path(
        "invoices/<uuid:invoice_id>/",
        SaleInvoiceDetailView.as_view(),
        name="sales-invoices-detail",
    ),
    path("print-logs/", PrintLogListCreateView.as_view(), name="sales-print-logs"),
]
