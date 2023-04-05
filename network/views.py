import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.core.paginator import Paginator
from .models import User, Post


def index(request):
    return render(request, "network/index.html")


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")


@login_required
def compose(request):
    data = json.loads(request.body)
    content = data.get("content")

    # Create a post
    if request.method == "POST":
        post = Post(
            content=content,
            user=request.user
        )

        post.save()
        latest_post = Post.objects.last()
        return JsonResponse(latest_post.serialize(),
                            status=201)

    # Edit a post
    elif request.method == "PUT":
        post_id = data.get("postId")
        post = Post.objects.get(pk=post_id)
        post.content = content

        post.save()
        return JsonResponse(post.serialize(),
                            status=201)


def post(request, post_id):
    try:
        post = Post.objects.get(pk=post_id)
    except Post.DoesNotExist:
        return JsonResponse({"error": "Post not found."},
                            status=404)

    if request.method == 'GET':
        return JsonResponse({"content": post.serialize()})

    # Mark a post as liked and return the number of likes
    elif request.method == "PUT":
        user = request.user
        data = json.loads(request.body)
        likes = post.likes.all()
        if data.get("like"):
            if user in likes:
                post.likes.remove(user)
            else:
                post.likes.add(user)
        post.save()
        likes = post.likes.all()
        return JsonResponse({"likes": likes.count()})

    else:
        return JsonResponse({"error": "GET or PUT request required."},
                            status=400)


def load_posts(request, filter):
    posts = []
    page_number = int(request.GET.get("page") or 1)

    if request.method == 'GET':
        # Get all posts
        if filter == "all":
            posts = Post.objects.all().order_by("-timestamp")

        # Get posts from all followed users
        elif filter == "following":
            followed_users = request.user.following.all()
            posts = Post.objects.filter(user__in=followed_users) \
                        .order_by("-timestamp")

            if not posts:
                return JsonResponse({"error": "You have no followed posts, \
                            try following some more people!"})

        # Get posts for a user's profile
        elif filter == "profile":
            user = request.GET.get("user")
            try:
                user = User.objects.get(username=user)
            except User.DoesNotExist:
                return JsonResponse({"error": "User not found."}, status=404)
            posts = Post.objects.filter(user=user).order_by("-timestamp")

        # Split posts into pages of 10
        paginator = Paginator(posts, 10)
        # Get the requested page
        requested_page = paginator.page(page_number)
        post_obj = requested_page.object_list
        # Get total number of pages to display a button for each
        total_pages = paginator.num_pages

        if request.GET.get("pages"):
            return JsonResponse({"pages": total_pages})

        return JsonResponse([post.serialize() for post in post_obj],
                            safe=False)
    else:
        return JsonResponse({"error": "GET request required."},
                            status=400)


def load_profile(request, username):
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found."},
                            status=404)

    following = user.following.all()
    followers = user.followers.all()
    button_text = ""

    if request.user != user:
        if request.user in followers:
            button_text = "Unfollow"
        else:
            button_text = "Follow"

    # Follow and unfollow users
    if request.method == "PUT":
        data = json.loads(request.body)
        if request.user != user:
            if data.get("follow"):
                if request.user in followers:
                    user.followers.remove(request.user)
                    button_text = "Follow"
                else:
                    user.followers.add(request.user)
                    button_text = "Unfollow"

    following = user.following.all()
    followers = user.followers.all()
    user_data = {
        "username": user.username,
        "id": user.id,
        "followers": followers.count(),
        "following": following.count(),
        "buttonText": button_text
    }
    return JsonResponse(user_data)
