from django.urls import path
from . import views

urlpatterns = [
    path('', views.HomeView.as_view(), name='home'),
    path('signup', views.SignupView.as_view(), name='signup'),
    path('login', views.LoginView.as_view(), name='login'),
    path('account', views.AccountView.as_view(), name='account'),
    path('rooms', views.RoomsView.as_view(), name='rooms'),
    path('rooms/new', views.CreateRoomView.as_view(), name='create_room'),
    path('rooms/<str:room_name>', views.RoomView.as_view(), name='room'),
    path('tg/<str:link>', views.TelegramLinkView.as_view()),
    path('language', views.LanguageView.as_view(), name='language'),
    path('<str:language_code>', views.set_language),
    path('<url>/', views.delete_slash1),
    path('<url1>/<url2>/', views.delete_slash2)
]
