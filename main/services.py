import hashlib
import math
import os
import random
import string
import json
import uuid
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import logout
from PIL import Image
from .models import User, Room, Message


def room_context(user, room, context):
    room_messages = Message.objects.filter(room=room).order_by('sent')
    senders, texts, sent = [], [], []
    for i in room_messages:
        senders.append(i.sender.username)
        texts.append(i.text)
        if i.is_read is False:
            i.is_read = True
            i.save()
        sent_tz = format_sent(user, i.sent)
        sent.append(sent_tz)
    length = 0
    my_messages = Message.objects.filter(sender=user)
    if my_messages.count() > 0:
        for i in my_messages:
            length += len(i.text)
        available_length = int(settings.MESSAGE_LENGTH_LIMIT) - length
    else:
        available_length = int(settings.MESSAGE_LENGTH_LIMIT)
    if room_messages.count() > 0:
        last_sent = str(room_messages[room_messages.count() - 1].sent)
    else:
        last_sent = ''
    context['senders'] = senders
    context['texts'] = texts
    context['sent'] = sent
    context['available_length'] = available_length
    context['last_sent'] = last_sent
    return context


def rooms_context(user, context):
    my_rooms = Room.objects.filter(user1=user) | Room.objects.filter(user2=user)
    rooms = []
    for i in my_rooms:
        if i.user1 == user:
            recipient = User.objects.get(id=i.user2.id)
        else:
            recipient = User.objects.get(id=i.user1.id)
        messages = Message.objects.filter(room=i)
        unread_messages = Message.objects.filter(sender=recipient, is_read=False)
        rooms.append({
            'name': i.name,
            'recipient': recipient.username,
            'recipient_avatar': str(recipient.avatar),
            'message_count': messages.count(),
            'unread_count': unread_messages.count()
        })
    length = 0
    my_messages = Message.objects.filter(sender=user)
    if my_messages.count() > 0:
        for i in my_messages:
            length += len(i.text)
        used = round(length * 100 / int(settings.MESSAGE_LENGTH_LIMIT))
    else:
        used = 0
    context['rooms'] = rooms
    context['used'] = used
    return context


def valid_username(username, current_username=None):
    if username.lower() == 'admin':
        valid = False
    elif 4 < len(username) < 33:
        error = False
        for i in username:
            if i in string.ascii_letters:
                continue
            elif i in string.digits:
                continue
            elif i == '_':
                continue
            else:
                error = True
                break
        if error is True:
            valid = False
        else:
            if current_username is not None and username.lower() == current_username.lower():
                valid = True
            else:
                if User.objects.filter(username_lower=username.lower()).exists():
                    valid = False
                else:
                    valid = True
    else:
        valid = False
    return valid


def base_context(request):
    with open(f'{settings.BASE_DIR}/translation.json') as f:
        translation = json.loads(f.read())
    language = request.session.get('language', 'en')
    context = {}
    try:
        context['local'] = translation[language]
    except KeyError:
        context['local'] = translation['en']
    return context


def get_post_data(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        data = ''
    return data


def create_room_name():
    symbols = string.ascii_letters + string.digits
    while True:
        room_name = ''.join([random.choice(symbols) for _ in range(10)])
        if Room.objects.filter(name=room_name).exists():
            continue
        else:
            break
    return room_name


def get_ip_hash(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        client_ip = x_forwarded_for.split(',')[0]
    else:
        client_ip = request.META.get('REMOTE_ADDR')
    h = hashlib.sha256()
    h.update(client_ip.encode())
    ip_hash = h.hexdigest()
    return ip_hash


def save_avatar(avatar, user):
    try:
        filename = str(avatar)
        if user.avatar != '':
            os.remove(f'{settings.BASE_DIR}/media/{str(user.avatar)}')
        user.avatar = avatar
        user.save()
        while True:
            new_name = uuid.uuid4()
            avatar_name = f'avatars/{new_name}.jpg'
            if User.objects.filter(avatar=avatar_name).exists():
                continue
            else:
                break
        img = Image.open(f'{settings.BASE_DIR}/media/{str(user.avatar)}')
        max_size = 300
        if img.width > max_size or img.height > max_size:
            if img.width > img.height:
                new_width = max_size
                new_height = math.floor(max_size * img.height / img.width)
            elif img.height > img.width:
                new_width = math.floor(max_size * img.width / img.height)
                new_height = max_size
            elif img.width == img.height:
                new_width = max_size
                new_height = max_size
            img = img.resize((new_width, new_height), Image.LANCZOS)
        img.save(f'{settings.BASE_DIR}/media/{avatar_name}', 'jpeg')
        user.avatar = avatar_name
        user.save()
        os.remove(f'{settings.BASE_DIR}/media/avatars/{filename}')
    except:
        return 'error'


def format_sent(user, sent):
    sent_tz = sent + timedelta(hours=float(user.utc_offset))
    year = str(sent_tz.year)[2:]
    month = sent_tz.month
    day = sent_tz.day
    hour = sent_tz.hour
    minute = sent_tz.minute
    if minute < 10:
        minute = f'0{minute}'
    return f'{hour}:{minute} · {day}.{month}.{year}'


utc_offsets = (
    ('-12:00', '-12'),
    ('-11:00', '-11'),
    ('-10:00', '-10'),
    ('-09:30', '-9.5'),
    ('-09:00', '-9'),
    ('-08:00', '-8'),
    ('-07:00', '-7'),
    ('-06:00', '-6'),
    ('-05:00', '-5'),
    ('-04:00', '-4'),
    ('-03:30', '-3.5'),
    ('-03:00', '-3'),
    ('-02:00', '-2'),
    ('-01:00', '-1'),
    ('±00:00', '0'),
    ('+01:00', '1'),
    ('+02:00', '2'),
    ('+03:00', '3'),
    ('+03:30', '3.5'),
    ('+04:00', '4'),
    ('+04:30', '4.5'),
    ('+05:00', '5'),
    ('+05:30', '5.5'),
    ('+05:45', '5.75'),
    ('+06:00', '6'),
    ('+06:30', '6.5'),
    ('+07:00', '7'),
    ('+08:00', '8'),
    ('+08:45', '8.75'),
    ('+09:00', '9'),
    ('+09:30', '9.5'),
    ('+10:00', '10'),
    ('+10:30', '10.5'),
    ('+11:00', '11'),
    ('+12:00', '12'),
    ('+12:45', '12.75'),
    ('+13:00', '13'),
    ('+14:00', '14'),
)
