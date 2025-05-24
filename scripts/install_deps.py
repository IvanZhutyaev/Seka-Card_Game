#!/usr/bin/env python3
"""
Скрипт для установки зависимостей проекта.
Устанавливает Python-пакеты, системные зависимости и настраивает окружение.
"""

import os
import sys
import subprocess
import platform
from typing import List, Dict

# Зависимости для разных операционных систем
SYSTEM_DEPS = {
    'Linux': [
        'python3-dev',
        'python3-pip',
        'python3-venv',
        'build-essential',
        'libpq-dev',
        'redis-server',
        'postgresql',
        'postgresql-contrib',
        'nginx',
        'certbot',
        'python3-certbot-nginx',
        'supervisor',
        'fail2ban',
        'ufw',
    ],
    'Darwin': [
        'python3',
        'pip3',
        'postgresql',
        'redis',
        'nginx',
        'certbot',
        'supervisor',
        'fail2ban',
    ],
    'Windows': [
        'python',
        'pip',
        'postgresql',
        'redis',
        'nginx',
        'certbot',
        'supervisor',
        'fail2ban',
    ]
}

# Python-пакеты
PYTHON_DEPS = [
    'fastapi==0.68.1',
    'uvicorn==0.15.0',
    'sqlalchemy==1.4.23',
    'psycopg2-binary==2.9.1',
    'redis==3.5.3',
    'python-jose==3.3.0',
    'passlib==1.7.4',
    'python-multipart==0.0.5',
    'python-dotenv==0.19.0',
    'aiohttp==3.8.1',
    'prometheus-client==0.11.0',
    'sentry-sdk==1.3.1',
    'pytest==6.2.5',
    'pytest-asyncio==0.15.1',
    'pytest-cov==2.12.1',
    'black==21.9b0',
    'isort==5.9.3',
    'flake8==3.9.2',
    'mypy==0.910',
]

def run_command(command: List[str], shell: bool = False) -> bool:
    """Выполняет команду и возвращает True в случае успеха."""
    try:
        subprocess.run(command, check=True, shell=shell)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при выполнении команды: {e}")
        return False

def install_system_deps() -> bool:
    """Устанавливает системные зависимости."""
    system = platform.system()
    if system not in SYSTEM_DEPS:
        print(f"Неподдерживаемая операционная система: {system}")
        return False
    
    deps = SYSTEM_DEPS[system]
    if system == 'Linux':
        # Для Ubuntu/Debian
        return run_command(['sudo', 'apt-get', 'update']) and \
               run_command(['sudo', 'apt-get', 'install', '-y'] + deps)
    elif system == 'Darwin':
        # Для macOS
        return run_command(['brew', 'install'] + deps)
    else:
        # Для Windows
        print("Для Windows установите зависимости вручную:")
        for dep in deps:
            print(f"- {dep}")
        return True

def create_virtual_env() -> bool:
    """Создает виртуальное окружение Python."""
    if not os.path.exists('venv'):
        return run_command([sys.executable, '-m', 'venv', 'venv'])
    return True

def install_python_deps() -> bool:
    """Устанавливает Python-пакеты."""
    pip_cmd = 'venv/Scripts/pip' if platform.system() == 'Windows' else 'venv/bin/pip'
    return run_command([pip_cmd, 'install', '--upgrade', 'pip']) and \
           run_command([pip_cmd, 'install'] + PYTHON_DEPS)

def setup_directories() -> bool:
    """Создает необходимые директории."""
    directories = [
        'logs',
        'static',
        'templates',
        'tests',
        'docs',
    ]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    return True

def main() -> None:
    """Основная функция установки зависимостей."""
    print("Установка зависимостей...")
    
    steps = [
        ("Установка системных зависимостей", install_system_deps),
        ("Создание виртуального окружения", create_virtual_env),
        ("Установка Python-пакетов", install_python_deps),
        ("Создание директорий", setup_directories),
    ]
    
    success = True
    for step_name, step_func in steps:
        print(f"\n{step_name}...")
        if not step_func():
            print(f"Ошибка при {step_name.lower()}")
            success = False
            break
    
    if success:
        print("\nУстановка зависимостей завершена успешно!")
        print("\nСледующие шаги:")
        print("1. Настройте базу данных PostgreSQL")
        print("2. Настройте Redis")
        print("3. Настройте Nginx")
        print("4. Создайте файл .env с помощью скрипта generate_env.py")
        print("5. Проверьте настройки с помощью скрипта check_env.py")
    else:
        print("\nУстановка зависимостей не удалась!")
        sys.exit(1)

if __name__ == '__main__':
    main() 