from django.urls import path

from .views import PremiumCapabilitiesView

urlpatterns = [
    path("capabilities/", PremiumCapabilitiesView.as_view(), name="premium-capabilities"),
]
