
from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    # API Routes
    path("profile/<str:username>", views.load_profile, name="profile"),
    path("posts", views.compose, name="compose"),
    path("posts/<str:filter>", views.load_posts, name="load_posts"),
    path("post/<int:post_id>", views.post, name="post"),
]
