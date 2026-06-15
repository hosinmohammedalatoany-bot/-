from django.urls import path

from .views import (
    DailyCashCloseView,
    DailyCashListCreateView,
    DailyCashTransactionCreateView,
    ExpenseDetailView,
    ExpenseListCreateView,
    FinancialSummaryView,
    VehicleProfitView,
)

urlpatterns = [
    path("summary/", FinancialSummaryView.as_view(), name="accounting-summary"),
    path(
        "vehicle-profit/<uuid:vehicle_id>/",
        VehicleProfitView.as_view(),
        name="accounting-vehicle-profit",
    ),
    path("expenses/", ExpenseListCreateView.as_view(), name="accounting-expenses"),
    path(
        "expenses/<uuid:expense_id>/",
        ExpenseDetailView.as_view(),
        name="accounting-expense-detail",
    ),
    path("daily-cash/", DailyCashListCreateView.as_view(), name="accounting-daily-cash"),
    path(
        "daily-cash/<uuid:register_id>/transactions/",
        DailyCashTransactionCreateView.as_view(),
        name="accounting-daily-cash-tx",
    ),
    path(
        "daily-cash/<uuid:register_id>/close/",
        DailyCashCloseView.as_view(),
        name="accounting-daily-cash-close",
    ),
]
