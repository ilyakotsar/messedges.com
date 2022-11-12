import hashlib
import os
import requests
from datetime import datetime
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponseRedirect
from django.shortcuts import render, redirect
from django.views import View
from django.utils.decorators import method_decorator
from rest_framework.response import Response
from rest_framework.views import APIView
from main import services
from .models import User, Room, Message


class HomeView(View):
    url_name = 'home'
    template_name = 'home.html'

    def get(self, request):
        context = services.base_context(request)
        return render(request, self.template_name, context)


class SignupView(View):
    url_name = 'signup'
    template = 'signup.html'

    def get(self, request):
        if request.user.is_authenticated:
            return redirect('account')
        else:
            context = services.base_context(request)
            return render(request, self.template, context)

    def post(self, request):
        if 'username' in request.POST:
            ip_hash = services.get_ip_hash(request)
            username = request.POST['username'].strip()
            password = request.POST['password']
            if User.objects.filter(ip_hash=ip_hash).count() >= 2:
                return redirect(self.url_name)
            elif services.valid_username(username) is False:
                return redirect(self.url_name)
            elif len(password) < 10:
                return redirect(self.url_name)
            else:
                new_user = User(
                    username=username,
                    ip_hash=ip_hash,
                )
                new_user.set_password(password)
                new_user.save()
                auth_user = authenticate(username=username, password=password)
                login(request, auth_user)
                return redirect('rooms')


class LoginView(View):
    url_name = 'login'
    template = 'login.html'

    def get(self, request):
        if request.user.is_authenticated:
            return redirect('account')
        else:
            context = services.base_context(request)
            return render(request, self.template, context)

    def post(self, request):
        if 'username' in request.POST:
            language = request.session.get('language', 'en')
            try:
                user = User.objects.get(username_lower=request.POST['username'].lower().strip())
                auth_user = authenticate(username=user.username, password=request.POST['password'])
                if auth_user is not None:
                    login(request, auth_user)
                    return redirect('rooms')
                else:
                    return redirect(self.url_name)
            except User.DoesNotExist:
                return redirect(self.url_name)


@method_decorator(login_required(login_url=settings.LOGIN_URL), name='dispatch')
class AccountView(View):
    url_name = 'account'
    template_name = 'account.html'

    def get(self, request):
        context = services.base_context(request)
        context['utc_offsets'] = services.utc_offsets
        return render(request, self.template_name, context)

    def post(self, request):
        user = request.user
        if 'avatar' in request.FILES:
            services.save_avatar(request.FILES['avatar'], user)
            return redirect(self.url_name)
        elif 'delete-avatar' in request.POST:
            os.remove(f'{settings.BASE_DIR}/media/{str(user.avatar)}')
            user.avatar = None
            user.save()
            return redirect(self.url_name)
        elif 'username' in request.POST:
            username = request.POST['username'].strip()
            if services.valid_username(username, user.username) is True:
                user.username = username
                user.save()
            return redirect(self.url_name)
        elif 'password' in request.POST:
            password = request.POST['password']
            if len(password) > 9:
                user.set_password(password)
                user.save()
            return redirect(self.url_name)
        elif 'utc-offset' in request.POST:
            user.utc_offset = request.POST['utc-offset']
            user.save()
            return redirect(self.url_name)
        elif 'disable-telegram' in request.POST:
            user.telegram_link_hash = ''
            user.telegram_chat_id = ''
            user.telegram_connected = False
            user.save()
            return redirect(self.url_name)
        elif 'delete-account' in request.POST:
            user.delete()
            return redirect('home')
        elif 'logout' in request.POST:
            logout(request)
            return redirect('home')
        else:
            return redirect(self.url_name)


@method_decorator(login_required(login_url=settings.LOGIN_URL), name='dispatch')
class RoomsView(View):
    url_name = 'rooms'
    template_name = 'rooms.html'

    def get(self, request):
        context = services.base_context(request)
        context = services.rooms_context(request.user, context)
        return render(request, self.template_name, context)

    def post(self, request):
        if 'delete-room' in request.POST:
            room_name = request.POST['delete-room']
            room = Room.objects.get(name=room_name)
            room.delete()
            return redirect('rooms')


@method_decorator(login_required(login_url=settings.LOGIN_URL), name='dispatch')
class CreateRoomView(View):
    url_name = 'create_room'
    template_name = 'create_room.html'

    def get(self, request):
        context = services.base_context(request)
        return render(request, self.template_name, context)

    def post(self, request):
        user = request.user
        data = services.get_post_data(request)
        if 'username' in data:
            try:
                recipient = User.objects.get(username_lower=data['username'].lower().strip())
                if Room.objects.filter(user1=user, user2=recipient).exists() or Room.objects.filter(user1=recipient, user2=user).exists():
                    return JsonResponse({'error': True})
                else:
                    new_room = Room(
                        name=services.create_room_name(),
                        user1=user,
                        user2=recipient,
                        g=data['g'],
                        p=data['p'],
                        user1_public_key=data['public_key']
                    )
                    new_room.save()
                    if recipient.telegram_connected is True:
                        requests.post(
                            url=f'https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage',
                            data={
                                'chat_id': int(recipient.telegram_chat_id),
                                'text': f'You have been invited to the new room https://messedges.com/rooms/{new_room.name}'
                            }
                        )
                    return JsonResponse({'success': True})
            except User.DoesNotExist:
                return JsonResponse({'error': True})


@method_decorator(login_required(login_url=settings.LOGIN_URL), name='dispatch')
class RoomView(View):
    url_name = 'room'
    template_name = 'room.html'

    def get(self, request, room_name):
        try:
            room = Room.objects.get(name=room_name)
        except Room.DoesNotExist:
            return redirect('rooms')
        user = request.user
        if room.user1 == user or room.user2 == user:
            context = services.base_context(request)
            context['room'] = room
            if room.user1 == user:
                recipient = room.user2
                recipient_public_key = room.user2_public_key
            else:
                recipient = room.user1
                recipient_public_key = room.user1_public_key
            context['recipient'] = recipient
            if room.user2_public_key == '':
                if room.user2 == user:
                    context['status'] = 'set_public_key'
                else:
                    context['status'] = 'waiting'
            else:
                context['status'] = 'active'
                context['recipient_public_key'] = recipient_public_key
                context = services.room_context(user, room, context)
            return render(request, 'room.html', context)
        else:
            return redirect('rooms')

    def post(self, request, room_name):
        user = request.user
        room = Room.objects.get(name=room_name)
        if user.pk == room.user1.pk or user.pk == room.user2.pk:
            data = services.get_post_data(request)
            if 'new_text' in data:
                room_messages = Message.objects.filter(room=room).order_by('-sent')
                if room_messages.count() == 0:
                    h = hashlib.sha512()
                    previous_hash = h.hexdigest()
                elif room_messages.count() > 0:
                    last_message = room_messages[0]
                    h = hashlib.sha512()
                    h.update(str(last_message.id).encode())
                    h.update(str(last_message.room.id).encode())
                    h.update(str(last_message.sender.id).encode())
                    h.update(str(last_message.text).encode())
                    h.update(str(last_message.sent).encode())
                    h.update(str(last_message.previous_hash).encode())
                    previous_hash = h.hexdigest()
                new_message = Message(
                    room=room,
                    sender=user,
                    text=data['new_text'],
                    sent=datetime.now(),
                    previous_hash=previous_hash
                )
                new_message.save()
                sent_tz = services.format_sent(user, new_message.sent)
                if room.user1 == request.user:
                    recipient = User.objects.get(id=room.user2.id)
                else:
                    recipient = User.objects.get(id=room.user1.id)
                if recipient.telegram_connected is True:
                    requests.post(
                        url=f'https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage',
                        data={
                            'chat_id': int(recipient.telegram_chat_id),
                            'text': f'New message from {user.username}'
                        }
                    )
                return JsonResponse({'sent': sent_tz})
            elif 'last_sent' in data:
                room_messages = Message.objects.filter(room=room).order_by('sent')
                if room_messages.count() > 0:
                    last_sent = str(room_messages[room_messages.count() - 1].sent)
                    if last_sent > data['last_sent']:
                        texts, sent = [], []
                        for i in room_messages:
                            if str(i.sent) > data['last_sent'] and i.sender.id != user.id:
                                texts.append(i.text)
                                i.is_read = True
                                i.save()
                                sent_tz = services.format_sent(user, i.sent)
                                sent.append(sent_tz)
                        return JsonResponse({
                            'texts': texts,
                            'sent': sent,
                            'last_sent': last_sent
                        })
                    else:
                        return JsonResponse({'status': 'error'})
                else:
                    return JsonResponse({'status': 'error'})
            elif 'public_key' in data:
                room.user2_public_key = data['public_key']
                room.save()
                if room.user1 == request.user:
                    recipient = User.objects.get(id=room.user2.id)
                else:
                    recipient = User.objects.get(id=room.user1.id)
                if recipient.telegram_connected is True:
                    requests.post(
                        url=f'https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage',
                        data={
                            'chat_id': int(recipient.telegram_chat_id),
                            'text': f'{user.username} has set a private key for room https://messedges.com/rooms/{room.name}'
                        }
                    )
                return JsonResponse({'success': True})
            else:
                return JsonResponse({'error': True})
        else:
            return redirect(self.url_name, room_name)


@method_decorator(login_required(login_url=settings.LOGIN_URL), name='dispatch')
class TelegramLinkView(View):

    def get(self, request, link):
        h = hashlib.sha512()
        h.update(link.encode())
        link_hash = h.hexdigest()
        try:
            user = User.objects.get(telegram_link_hash=link_hash)
            if user == request.user:
                user.telegram_connected = True
                user.telegram_link_hash = ''
                user.save()
                requests.post(
                    url=f'https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage',
                    data={
                        'chat_id': int(user.telegram_chat_id),
                        'text': f'You have enabled notifications for user {user.username}'
                    }
                )
            else:
                raise User.DoesNotExist
        except User.DoesNotExist:
            pass
        return redirect('account')


class LanguageView(View):
    url_name = 'language'
    template_name = 'language.html'

    def get(self, request):
        context = services.base_context(request)
        context['language'] = request.session.get('language', 'en')
        return render(request, self.template_name, context)

    def post(self, request):
        if 'language' in request.POST:
            request.session['language'] = request.POST.getlist('language')[0]
            return redirect('home')


class StatisticsView(APIView):
    def get(self, request):
        user_count = User.objects.all().count()
        rooms = Room.objects.all()
        active_rooms = 0
        for i in rooms:
            if i.user2_public_key != '':
                active_rooms += 1
        message_count = Message.objects.all().count()
        return Response({
            'users': user_count,
            'rooms': active_rooms,
            'messages': message_count
        })


def set_language(request, language_code):
    if language_code in ('en', 'ru'):
        request.session['language'] = language_code
    return redirect('home')


def delete_slash1(request, url):
    return HttpResponseRedirect(f'/{url}')


def delete_slash2(request, url1, url2):
    return HttpResponseRedirect(f'/{url1}/{url2}')
