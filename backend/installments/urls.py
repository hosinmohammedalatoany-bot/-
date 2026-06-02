from django.urls import path

from .views import (
    InstallmentContractListCreateView,
    InstallmentPaymentDetailView,
    InstallmentPaymentListCreateView,
    ScheduleEntryListView,
)

urlpatterns = [
    path("schedule/", ScheduleEntryListView.as_view(), name="installments-schedule"),
    path("contracts/", InstallmentContractListCreateView.as_view(), name="installments-contracts"),
    path("payments/", InstallmentPaymentListCreateView.as_view(), name="installments-payments"),
    path(
        "payments/<uuid:payment_id>/",
        InstallmentPaymentDetailView.as_view(),
        name="installments-payment-detail",
    ),
]
