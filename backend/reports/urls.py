from django.urls import path

from .views import ReportCatalogView, ReportDetailView, ReportExportView

urlpatterns = [
    path("", ReportCatalogView.as_view(), name="report-catalog"),
    path("data/", ReportDetailView.as_view(), name="report-data"),
    path("export/", ReportExportView.as_view(), name="report-export"),
]
