from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api/auth/", include("accounts.urls")),
    path("api/organization/", include("organization.urls")),
    path("api/vehicles/", include("vehicles.urls")),
    path("api/customers/", include("customers.urls")),
    path("api/leads/", include("customers.lead_urls")),
    path("api/sales/", include("sales.urls")),
    path("api/installments/", include("installments.urls")),
]
