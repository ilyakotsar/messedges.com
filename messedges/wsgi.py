import os
from django.core.wsgi import get_wsgi_application

SETTINGS_FOLDER = 'messedges'

os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'{SETTINGS_FOLDER}.settings')

application = get_wsgi_application()
