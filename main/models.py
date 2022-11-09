from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    avatar = models.ImageField(upload_to='avatars', blank=True, null=True)
    username_lower = models.CharField(max_length=255, unique=True)
    utc_offset = models.CharField(max_length=6, default='0')
    ip_hash = models.CharField(max_length=64, blank=True)
    telegram_link_hash = models.CharField(max_length=64, blank=True)
    telegram_chat_id = models.CharField(max_length=255, blank=True)
    telegram_connected = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        self.username_lower = self.username.lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username


class Room(models.Model):
    name = models.CharField(max_length=20, unique=True)
    user1 = models.ForeignKey(User, related_name='user1', blank=True, null=True, on_delete=models.CASCADE)
    user2 = models.ForeignKey(User, related_name='user2', blank=True, null=True, on_delete=models.CASCADE)
    user1_public_key = models.TextField()
    user2_public_key = models.TextField(blank=True)
    g = models.TextField()
    p = models.TextField()

    def __str__(self):
        return self.name


class Message(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    sent = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return self.room.name
