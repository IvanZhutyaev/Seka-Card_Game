#!/usr/bin/env python3
"""
Скрипт для настройки Nginx.
Создает конфигурацию Nginx для проксирования запросов к приложению.
"""

import os
import sys
import subprocess
from typing import List, Dict
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

# Шаблон конфигурации Nginx
NGINX_CONF_TEMPLATE = """
server {{
    listen 80;
    server_name {domain};
    
    # Редирект на HTTPS
    location / {{
        return 301 https://$host$request_uri;
    }}
}}

server {{
    listen 443 ssl http2;
    server_name {domain};
    
    # SSL конфигурация
    ssl_certificate /etc/letsencrypt/live/{domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{domain}/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Современная конфигурация
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Другие заголовки безопасности
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy strict-origin-when-cross-origin;
    
    # Корневая директория
    root {static_dir};
    
    # Логи
    access_log /var/log/nginx/{domain}_access.log;
    error_log /var/log/nginx/{domain}_error.log;
    
    # Проксирование к приложению
    location / {{
        proxy_pass http://localhost:{app_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }}
    
    # Статические файлы
    location /static/ {{
        alias {static_dir}/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }}
    
    # Медиа файлы
    location /media/ {{
        alias {media_dir}/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }}
    
    # Запрет доступа к скрытым файлам
    location ~ /\. {{
        deny all;
        access_log off;
        log_not_found off;
    }}
}}
"""

def create_nginx_conf() -> bool:
    """Создает конфигурацию Nginx."""
    domain = os.getenv('DOMAIN', 'localhost')
    app_port = os.getenv('PORT', '3000')
    static_dir = os.getenv('STATIC_DIR', '/var/www/seka-game/static')
    media_dir = os.getenv('MEDIA_DIR', '/var/www/seka-game/media')
    
    # Создание конфигурации
    conf_content = NGINX_CONF_TEMPLATE.format(
        domain=domain,
        app_port=app_port,
        static_dir=static_dir,
        media_dir=media_dir
    )
    
    # Запись в файл
    conf_path = f'/etc/nginx/sites-available/{domain}'
    try:
        with open(conf_path, 'w') as f:
            f.write(conf_content)
    except IOError as e:
        print(f"Ошибка при создании конфигурации Nginx: {e}")
        return False
    
    return True

def enable_site() -> bool:
    """Включает сайт в Nginx."""
    domain = os.getenv('DOMAIN', 'localhost')
    try:
        # Создание символической ссылки
        subprocess.run(['sudo', 'ln', '-sf', f'/etc/nginx/sites-available/{domain}', f'/etc/nginx/sites-enabled/{domain}'], check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при включении сайта: {e}")
        return False

def test_nginx_config() -> bool:
    """Проверяет конфигурацию Nginx."""
    try:
        subprocess.run(['sudo', 'nginx', '-t'], check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка в конфигурации Nginx: {e}")
        return False

def restart_nginx() -> bool:
    """Перезапускает Nginx."""
    try:
        subprocess.run(['sudo', 'systemctl', 'restart', 'nginx'], check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при перезапуске Nginx: {e}")
        return False

def setup_ssl() -> bool:
    """Настраивает SSL с помощью Certbot."""
    domain = os.getenv('DOMAIN', 'localhost')
    email = os.getenv('ADMIN_EMAIL')
    
    if not email:
        print("Ошибка: не установлен email администратора")
        return False
    
    try:
        subprocess.run([
            'sudo', 'certbot', '--nginx',
            '-d', domain,
            '--non-interactive',
            '--agree-tos',
            '-m', email
        ], check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при настройке SSL: {e}")
        return False

def main() -> None:
    """Основная функция настройки Nginx."""
    print("Настройка Nginx...")
    
    steps = [
        ("Создание конфигурации", create_nginx_conf),
        ("Включение сайта", enable_site),
        ("Проверка конфигурации", test_nginx_config),
        ("Настройка SSL", setup_ssl),
        ("Перезапуск Nginx", restart_nginx),
    ]
    
    success = True
    for step_name, step_func in steps:
        print(f"\n{step_name}...")
        if not step_func():
            print(f"Ошибка при {step_name.lower()}")
            success = False
            break
    
    if success:
        print("\nНастройка Nginx завершена успешно!")
        print("\nНастроены следующие параметры:")
        print("- Проксирование запросов к приложению")
        print("- Обслуживание статических файлов")
        print("- SSL/TLS с современными настройками")
        print("- Заголовки безопасности")
        print("- Кэширование статических файлов")
    else:
        print("\nНастройка Nginx не удалась!")
        sys.exit(1)

if __name__ == '__main__':
    main() 