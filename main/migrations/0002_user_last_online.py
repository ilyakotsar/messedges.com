# Generated by Django 4.1.3 on 2022-11-19 05:16

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='last_online',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]