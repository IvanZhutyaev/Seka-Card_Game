#!/usr/bin/env python3
"""
Скрипт для настройки Certbot.
Настраивает SSL-сертификаты для домена.
"""

import os
import sys
import subprocess
from typing import List, Dict
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

def run_certbot_command(command: List[str]) -> bool:
    """Выполняет команду Certbot."""
    try:
        subprocess.run(['sudo', 'certbot'] + command, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при выполнении команды Certbot: {e}")
        return False

def obtain_certificate() -> bool:
    """Получает SSL-сертификат для домена."""
    domain = os.getenv('DOMAIN')
    email = os.getenv('ADMIN_EMAIL')
    
    if not domain or not email:
        print("Ошибка: не установлены домен или email администратора")
        return False
    
    return run_certbot_command([
        '--nginx',
        '-d', domain,
        '--non-interactive',
        '--agree-tos',
        '-m', email
    ])

def setup_auto_renewal() -> bool:
    """Настраивает автоматическое обновление сертификатов."""
    # Проверка существования cron-задачи
    try:
        result = subprocess.run(
            ['sudo', 'crontab', '-l'],
            capture_output=True,
            text=True,
            check=True
        )
        
        if 'certbot renew' not in result.stdout:
            # Добавление задачи в crontab
            subprocess.run(
                ['sudo', 'crontab', '-l'],
                input='0 0 * * * certbot renew --quiet --post-hook "systemctl reload nginx"\n',
                text=True,
                check=True
            )
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при настройке автоматического обновления: {e}")
        return False

def test_renewal() -> bool:
    """Проверяет процесс обновления сертификатов."""
    return run_certbot_command(['renew', '--dry-run'])

def setup_nginx_ssl() -> bool:
    """Настраивает SSL в Nginx."""
    domain = os.getenv('DOMAIN')
    
    if not domain:
        print("Ошибка: не установлен домен")
        return False
    
    # Проверка конфигурации Nginx
    try:
        subprocess.run(['sudo', 'nginx', '-t'], check=True)
        
        # Перезагрузка Nginx
        subprocess.run(['sudo', 'systemctl', 'reload', 'nginx'], check=True)
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при настройке Nginx: {e}")
        return False

def verify_certificate() -> bool:
    """Проверяет SSL-сертификат."""
    domain = os.getenv('DOMAIN')
    
    if not domain:
        print("Ошибка: не установлен домен")
        return False
    
    try:
        # Проверка срока действия сертификата
        subprocess.run(
            ['sudo', 'certbot', 'certificates'],
            check=True
        )
        
        # Проверка доступности по HTTPS
        subprocess.run(
            ['curl', '-I', f'https://{domain}'],
            check=True
        )
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при проверке сертификата: {e}")
        return False

def main() -> None:
    """Основная функция настройки Certbot."""
    print("Настройка Certbot...")
    
    steps = [
        ("Получение сертификата", obtain_certificate),
        ("Настройка автоматического обновления", setup_auto_renewal),
        ("Проверка обновления", test_renewal),
        ("Настройка Nginx", setup_nginx_ssl),
        ("Проверка сертификата", verify_certificate),
    ]
    
    success = True
    for step_name, step_func in steps:
        print(f"\n{step_name}...")
        if not step_func():
            print(f"Ошибка при {step_name.lower()}")
            success = False
            break
    
    if success:
        print("\nНастройка Certbot завершена успешно!")
        print("\nНастроены следующие параметры:")
        print("- SSL-сертификат для домена")
        print("- Автоматическое обновление сертификатов")
        print("- Интеграция с Nginx")
        print("- Проверка работоспособности")
    else:
        print("\nНастройка Certbot не удалась!")
        sys.exit(1)

if __name__ == '__main__':
    main() 