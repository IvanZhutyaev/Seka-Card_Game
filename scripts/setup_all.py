#!/usr/bin/env python3
"""
Скрипт для запуска всех настроек проекта.
Выполняет настройку всех компонентов системы в правильном порядке.
"""

import os
import sys
import subprocess
from typing import List, Dict, Tuple
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

# Список скриптов настройки в порядке выполнения
SETUP_SCRIPTS = [
    ('Установка зависимостей', 'install_deps.py'),
    ('Генерация переменных окружения', 'generate_env.py'),
    ('Проверка переменных окружения', 'check_env.py'),
    ('Настройка базы данных', 'setup_db.py'),
    ('Настройка Redis', 'setup_redis.py'),
    ('Настройка Nginx', 'setup_nginx.py'),
    ('Настройка Supervisor', 'setup_supervisor.py'),
    ('Настройка Fail2ban', 'setup_fail2ban.py'),
    ('Настройка UFW', 'setup_ufw.py'),
    ('Настройка Certbot', 'setup_certbot.py'),
]

def run_script(script_name: str) -> bool:
    """Запускает скрипт настройки."""
    try:
        subprocess.run(['python3', f'scripts/{script_name}'], check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при выполнении скрипта {script_name}: {e}")
        return False

def check_requirements() -> bool:
    """Проверяет наличие необходимых прав и зависимостей."""
    # Проверка прав root
    if os.geteuid() != 0:
        print("Ошибка: скрипт должен быть запущен с правами root")
        return False
    
    # Проверка наличия Python 3
    try:
        subprocess.run(['python3', '--version'], check=True)
    except subprocess.CalledProcessError:
        print("Ошибка: Python 3 не установлен")
        return False
    
    # Проверка наличия pip
    try:
        subprocess.run(['pip3', '--version'], check=True)
    except subprocess.CalledProcessError:
        print("Ошибка: pip3 не установлен")
        return False
    
    return True

def create_backup() -> bool:
    """Создает резервную копию конфигураций."""
    backup_dir = 'backup'
    os.makedirs(backup_dir, exist_ok=True)
    
    config_files = [
        '/etc/nginx/nginx.conf',
        '/etc/nginx/sites-available/default',
        '/etc/supervisor/conf.d/supervisord.conf',
        '/etc/fail2ban/jail.local',
        '/etc/ufw/user.rules',
        '/etc/letsencrypt/',
    ]
    
    for file_path in config_files:
        if os.path.exists(file_path):
            try:
                subprocess.run(
                    ['sudo', 'cp', '-r', file_path, f'{backup_dir}/'],
                    check=True
                )
            except subprocess.CalledProcessError as e:
                print(f"Ошибка при создании резервной копии {file_path}: {e}")
                return False
    
    return True

def main() -> None:
    """Основная функция настройки."""
    print("Запуск настройки проекта...")
    
    # Проверка требований
    if not check_requirements():
        print("\nПроверка требований не пройдена!")
        sys.exit(1)
    
    # Создание резервной копии
    print("\nСоздание резервной копии конфигураций...")
    if not create_backup():
        print("Ошибка при создании резервной копии!")
        sys.exit(1)
    
    # Запуск скриптов настройки
    success = True
    for step_name, script_name in SETUP_SCRIPTS:
        print(f"\n{step_name}...")
        if not run_script(script_name):
            print(f"Ошибка при {step_name.lower()}")
            success = False
            break
    
    if success:
        print("\nНастройка проекта завершена успешно!")
        print("\nНастроены следующие компоненты:")
        for step_name, _ in SETUP_SCRIPTS:
            print(f"- {step_name}")
        print("\nСледующие шаги:")
        print("1. Проверьте логи на наличие ошибок")
        print("2. Проверьте доступность сервисов")
        print("3. Настройте мониторинг")
        print("4. Настройте резервное копирование")
    else:
        print("\nНастройка проекта не удалась!")
        sys.exit(1)

if __name__ == '__main__':
    main() 