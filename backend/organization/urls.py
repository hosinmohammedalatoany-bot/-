from django.urls import path

from . import views

urlpatterns = [
    path("public/company/", views.CompanyPublicView.as_view(), name="company-public"),
    path("company/", views.CompanyProfileView.as_view(), name="company-profile"),
    path("branches/", views.BranchListCreateView.as_view(), name="branch-list"),
    path("branches/<uuid:branch_id>/", views.BranchDetailView.as_view(), name="branch-detail"),
]
