#!/usr/bin/env python3
"""
Скрипт для настройки Supervisor.
Создает конфигурацию Supervisor для управления процессом приложения.
"""

import os
import sys
import subprocess
from typing import List, Dict
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

# Шаблон конфигурации Supervisor
SUPERVISOR_CONF_TEMPLATE = """
[program:seka-game]
command={venv_path}/bin/gunicorn app.main:app --workers {workers} --worker-class uvicorn.workers.UvicornWorker --bind {host}:{port} --log-level {log_level}
directory={app_dir}
user={app_user}
autostart=true
autorestart=true
stderr_logfile={log_dir}/supervisor.err.log
stdout_logfile={log_dir}/supervisor.out.log
environment=
    NODE_ENV="{node_env}",
    PYTHONPATH="{app_dir}",
    PATH="{venv_path}/bin:%(ENV_PATH)s"

[group:seka-game]
programs=seka-game

[supervisord]
logfile={log_dir}/supervisord.log
logfile_maxbytes=50MB
logfile_backups=10
loglevel=info
pidfile=/var/run/supervisord.pid
nodaemon=false
minfds=1024
minprocs=200

[supervisorctl]
serverurl=unix:///var/run/supervisor.sock

[unix_http_server]
file=/var/run/supervisor.sock
chmod=0700

[rpcinterface:supervisor]
supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface
"""

def create_supervisor_conf() -> bool:
    """Создает конфигурацию Supervisor."""
    # Получение значений из переменных окружения
    app_dir = os.getenv('APP_DIR', '/var/www/seka-game')
    venv_path = os.getenv('VENV_PATH', f'{app_dir}/venv')
    app_user = os.getenv('APP_USER', 'seka-game')
    host = os.getenv('HOST', 'localhost')
    port = os.getenv('PORT', '3000')
    workers = os.getenv('WORKERS', '4')
    log_level = os.getenv('LOG_LEVEL', 'info')
    node_env = os.getenv('NODE_ENV', 'production')
    log_dir = os.getenv('LOG_DIR', f'{app_dir}/logs')
    
    # Создание конфигурации
    conf_content = SUPERVISOR_CONF_TEMPLATE.format(
        venv_path=venv_path,
        workers=workers,
        host=host,
        port=port,
        log_level=log_level,
        app_dir=app_dir,
        app_user=app_user,
        node_env=node_env,
        log_dir=log_dir
    )
    
    # Запись в файл
    conf_path = '/etc/supervisor/conf.d/seka-game.conf'
    try:
        with open(conf_path, 'w') as f:
            f.write(conf_content)
    except IOError as e:
        print(f"Ошибка при создании конфигурации Supervisor: {e}")
        return False
    
    return True

def create_app_user() -> bool:
    """Создает пользователя для приложения."""
    app_user = os.getenv('APP_USER', 'seka-game')
    app_dir = os.getenv('APP_DIR', '/var/www/seka-game')
    
    try:
        # Создание пользователя
        subprocess.run(['sudo', 'useradd', '-r', '-s', '/bin/false', app_user], check=True)
        
        # Создание директории приложения
        subprocess.run(['sudo', 'mkdir', '-p', app_dir], check=True)
        
        # Установка прав
        subprocess.run(['sudo', 'chown', '-R', f'{app_user}:{app_user}', app_dir], check=True)
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при создании пользователя: {e}")
        return False

def setup_logrotate() -> bool:
    """Настраивает ротацию логов."""
    logrotate_conf = f"""
{os.getenv('LOG_DIR', '/var/www/seka-game/logs')}/*.log {{
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 {os.getenv('APP_USER', 'seka-game')} {os.getenv('APP_USER', 'seka-game')}
    sharedscripts
    postrotate
        /usr/bin/supervisorctl reload
    endscript
}}
"""
    
    try:
        with open('/etc/logrotate.d/seka-game', 'w') as f:
            f.write(logrotate_conf)
        return True
    except IOError as e:
        print(f"Ошибка при настройке logrotate: {e}")
        return False

def reload_supervisor() -> bool:
    """Перезагружает конфигурацию Supervisor."""
    try:
        subprocess.run(['sudo', 'supervisorctl', 'reload'], check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при перезагрузке Supervisor: {e}")
        return False

def main() -> None:
    """Основная функция настройки Supervisor."""
    print("Настройка Supervisor...")
    
    steps = [
        ("Создание пользователя приложения", create_app_user),
        ("Создание конфигурации", create_supervisor_conf),
        ("Настройка ротации логов", setup_logrotate),
        ("Перезагрузка Supervisor", reload_supervisor),
    ]
    
    success = True
    for step_name, step_func in steps:
        print(f"\n{step_name}...")
        if not step_func():
            print(f"Ошибка при {step_name.lower()}")
            success = False
            break
    
    if success:
        print("\nНастройка Supervisor завершена успешно!")
        print("\nНастроены следующие параметры:")
        print("- Управление процессом приложения")
        print("- Автоматический перезапуск при сбоях")
        print("- Ротация логов")
        print("- Мониторинг состояния")
    else:
        print("\nНастройка Supervisor не удалась!")
        sys.exit(1)

if __name__ == '__main__':
    main() 