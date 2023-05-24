from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    followers = models.ManyToManyField("self",
                                       blank=True,
                                       symmetrical=False,
                                       related_name="following")

    def serialize(self):
        return {
            "id": self.id,
            "username": self.username,
            "followers": [user.id for user in self.followers.all()]
        }


class Post(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    content = models.TextField()
    likes = models.ManyToManyField(User,
                                   blank=True,
                                   related_name="liked")
    user = models.ForeignKey(User,
                             null=True,
                             on_delete=models.CASCADE,
                             related_name='posts')

    def serialize(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.strftime("%d/%m/%Y, %H:%M"),
            "likes": [user.id for user in self.likes.all()],
            "content": self.content,
            "user": self.user.username
        }

    def __str__(self):
        return f"{self.user}: {self.content}"
