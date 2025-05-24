#!/usr/bin/env python3
"""
Скрипт для настройки UFW (Uncomplicated Firewall).
Настраивает правила брандмауэра для защиты сервера.
"""

import os
import sys
import subprocess
from typing import List, Dict
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

def run_ufw_command(command: List[str]) -> bool:
    """Выполняет команду UFW."""
    try:
        subprocess.run(['sudo', 'ufw'] + command, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при выполнении команды UFW: {e}")
        return False

def reset_ufw() -> bool:
    """Сбрасывает настройки UFW."""
    return run_ufw_command(['--force', 'reset'])

def enable_ufw() -> bool:
    """Включает UFW."""
    return run_ufw_command(['enable'])

def set_default_policies() -> bool:
    """Устанавливает политики по умолчанию."""
    commands = [
        ['default', 'deny', 'incoming'],
        ['default', 'allow', 'outgoing'],
    ]
    
    for command in commands:
        if not run_ufw_command(command):
            return False
    
    return True

def allow_ssh() -> bool:
    """Разрешает SSH-подключения."""
    return run_ufw_command(['allow', 'ssh'])

def allow_http() -> bool:
    """Разрешает HTTP-трафик."""
    return run_ufw_command(['allow', 'http'])

def allow_https() -> bool:
    """Разрешает HTTPS-трафик."""
    return run_ufw_command(['allow', 'https'])

def allow_postgresql() -> bool:
    """Разрешает подключения к PostgreSQL."""
    return run_ufw_command(['allow', '5432/tcp'])

def allow_redis() -> bool:
    """Разрешает подключения к Redis."""
    return run_ufw_command(['allow', '6379/tcp'])

def limit_ssh() -> bool:
    """Ограничивает количество SSH-подключений."""
    return run_ufw_command(['limit', 'ssh'])

def setup_logging() -> bool:
    """Настраивает логирование UFW."""
    return run_ufw_command(['logging', 'on'])

def main() -> None:
    """Основная функция настройки UFW."""
    print("Настройка UFW...")
    
    steps = [
        ("Сброс настроек", reset_ufw),
        ("Установка политик по умолчанию", set_default_policies),
        ("Разрешение SSH", allow_ssh),
        ("Ограничение SSH", limit_ssh),
        ("Разрешение HTTP", allow_http),
        ("Разрешение HTTPS", allow_https),
        ("Разрешение PostgreSQL", allow_postgresql),
        ("Разрешение Redis", allow_redis),
        ("Настройка логирования", setup_logging),
        ("Включение UFW", enable_ufw),
    ]
    
    success = True
    for step_name, step_func in steps:
        print(f"\n{step_name}...")
        if not step_func():
            print(f"Ошибка при {step_name.lower()}")
            success = False
            break
    
    if success:
        print("\nНастройка UFW завершена успешно!")
        print("\nНастроены следующие правила:")
        print("- Запрет входящих подключений по умолчанию")
        print("- Разрешение исходящих подключений по умолчанию")
        print("- Разрешение SSH с ограничением")
        print("- Разрешение HTTP/HTTPS")
        print("- Разрешение PostgreSQL")
        print("- Разрешение Redis")
        print("- Включено логирование")
    else:
        print("\nНастройка UFW не удалась!")
        sys.exit(1)

if __name__ == '__main__':
    main() 