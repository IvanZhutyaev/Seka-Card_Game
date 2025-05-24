#!/usr/bin/env python3
"""
Скрипт для настройки Fail2ban.
Создает конфигурацию Fail2ban для защиты от атак.
"""

import os
import sys
import subprocess
from typing import List, Dict
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

# Шаблон конфигурации Fail2ban
FAIL2BAN_CONF_TEMPLATE = """
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = {admin_email}
sender = fail2ban@localhost
action = %(action_mwl)s

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400

[nginx-bad-requests]
enabled = true
filter = nginx-bad-requests
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 3600

[nginx-noscript]
enabled = true
filter = nginx-noscript
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 3600

[nginx-proxy]
enabled = true
filter = nginx-proxy
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 2
bantime = 3600

[nginx-nohome]
enabled = true
filter = nginx-nohome
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 3600

[nginx-noproxy]
enabled = true
filter = nginx-noproxy
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 3600

[nginx-phpmyadmin]
enabled = true
filter = nginx-phpmyadmin
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 3600

[nginx-php-url-fopen]
enabled = true
filter = nginx-php-url-fopen
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400

[nginx-bad-requests]
enabled = true
filter = nginx-bad-requests
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 3600

[nginx-noscript]
enabled = true
filter = nginx-noscript
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 3600

[nginx-proxy]
enabled = true
filter = nginx-proxy
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 2
bantime = 3600

[nginx-nohome]
enabled = true
filter = nginx-nohome
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 3600

[nginx-noproxy]
enabled = true
filter = nginx-noproxy
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 3600

[nginx-phpmyadmin]
enabled = true
filter = nginx-phpmyadmin
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 3600

[nginx-php-url-fopen]
enabled = true
filter = nginx-php-url-fopen
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 3600
"""

def create_fail2ban_conf() -> bool:
    """Создает конфигурацию Fail2ban."""
    admin_email = os.getenv('ADMIN_EMAIL')
    
    if not admin_email:
        print("Ошибка: не установлен email администратора")
        return False
    
    # Создание конфигурации
    conf_content = FAIL2BAN_CONF_TEMPLATE.format(admin_email=admin_email)
    
    # Запись в файл
    conf_path = '/etc/fail2ban/jail.local'
    try:
        with open(conf_path, 'w') as f:
            f.write(conf_content)
    except IOError as e:
        print(f"Ошибка при создании конфигурации Fail2ban: {e}")
        return False
    
    return True

def create_filters() -> bool:
    """Создает фильтры для Fail2ban."""
    filters = {
        'nginx-http-auth': """
[Definition]
failregex = ^ \[error\] \d+#\d+: \*\d+ user "(?:[^"]+)" was not found in "(?:[^"]+)", client: <HOST>, server: \S+, request: "\S+ \S+ HTTP/\d+\.\d+", host: "\S+"$
            ^ \[error\] \d+#\d+: \*\d+ no user/password was provided for basic authentication, client: <HOST>, server: \S+, request: "\S+ \S+ HTTP/\d+\.\d+", host: "\S+"$
            ^ \[error\] \d+#\d+: \*\d+ user "(?:[^"]+)" was not found in "(?:[^"]+)", client: <HOST>, server: \S+, request: "\S+ \S+ HTTP/\d+\.\d+", host: "\S+"$
            ^ \[error\] \d+#\d+: \*\d+ no user/password was provided for basic authentication, client: <HOST>, server: \S+, request: "\S+ \S+ HTTP/\d+\.\d+", host: "\S+"$
ignoreregex =
""",
        'nginx-botsearch': """
[Definition]
failregex = ^<HOST> - \S+ \[\] "GET \/[^ ]* HTTP\/[0-9.]+" 404 .+ "-" "Mozilla\/5\.0 \(compatible; [^\/]+\/[0-9.]+; \+http:\/\/[^\)]+\)"$
ignoreregex =
""",
        'nginx-bad-requests': """
[Definition]
failregex = ^<HOST> - \S+ \[\] "GET \/[^ ]* HTTP\/[0-9.]+" 400 .+ "-" ".*"$
ignoreregex =
""",
        'nginx-noscript': """
[Definition]
failregex = ^<HOST> - \S+ \[\] "GET \/[^ ]*\.(?:php|asp|aspx|jsp|cgi) HTTP\/[0-9.]+" 404 .+ "-" ".*"$
ignoreregex =
""",
        'nginx-proxy': """
[Definition]
failregex = ^<HOST> - \S+ \[\] "GET \/[^ ]* HTTP\/[0-9.]+" 502 .+ "-" ".*"$
ignoreregex =
""",
        'nginx-limit-req': """
[Definition]
failregex = ^<HOST> - \S+ \[\] "GET \/[^ ]* HTTP\/[0-9.]+" 503 .+ "-" ".*"$
ignoreregex =
""",
        'nginx-nohome': """
[Definition]
failregex = ^<HOST> - \S+ \[\] "GET \/home\/[^ ]* HTTP\/[0-9.]+" 404 .+ "-" ".*"$
ignoreregex =
""",
        'nginx-noproxy': """
[Definition]
failregex = ^<HOST> - \S+ \[\] "GET \/[^ ]* HTTP\/[0-9.]+" 502 .+ "-" ".*"$
ignoreregex =
""",
        'nginx-phpmyadmin': """
[Definition]
failregex = ^<HOST> - \S+ \[\] "GET \/phpmyadmin\/[^ ]* HTTP\/[0-9.]+" 404 .+ "-" ".*"$
ignoreregex =
""",
        'nginx-php-url-fopen': """
[Definition]
failregex = ^<HOST> - \S+ \[\] "GET \/[^ ]*\.php\?[^ ]* HTTP\/[0-9.]+" 404 .+ "-" ".*"$
ignoreregex =
"""
    }
    
    for filter_name, filter_content in filters.items():
        filter_path = f'/etc/fail2ban/filter.d/{filter_name}.conf'
        try:
            with open(filter_path, 'w') as f:
                f.write(filter_content)
        except IOError as e:
            print(f"Ошибка при создании фильтра {filter_name}: {e}")
            return False
    
    return True

def restart_fail2ban() -> bool:
    """Перезапускает Fail2ban."""
    try:
        subprocess.run(['sudo', 'systemctl', 'restart', 'fail2ban'], check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при перезапуске Fail2ban: {e}")
        return False

def main() -> None:
    """Основная функция настройки Fail2ban."""
    print("Настройка Fail2ban...")
    
    steps = [
        ("Создание конфигурации", create_fail2ban_conf),
        ("Создание фильтров", create_filters),
        ("Перезапуск Fail2ban", restart_fail2ban),
    ]
    
    success = True
    for step_name, step_func in steps:
        print(f"\n{step_name}...")
        if not step_func():
            print(f"Ошибка при {step_name.lower()}")
            success = False
            break
    
    if success:
        print("\nНастройка Fail2ban завершена успешно!")
        print("\nНастроены следующие параметры:")
        print("- Защита от брутфорс-атак")
        print("- Защита от сканирования уязвимостей")
        print("- Защита от ботов")
        print("- Защита от плохих запросов")
        print("- Уведомления администратора")
    else:
        print("\nНастройка Fail2ban не удалась!")
        sys.exit(1)

if __name__ == '__main__':
    main() 