# Подробное руководство по запуску Seka Card Game

## Содержание
1. [Требования](#требования)
2. [Подготовка окружения](#подготовка-окружения)
3. [Установка зависимостей](#установка-зависимостей)
4. [Настройка базы данных](#настройка-базы-данных)
5. [Настройка Redis](#настройка-redis)
6. [Настройка Nginx](#настройка-nginx)
7. [Настройка SSL](#настройка-ssl)
8. [Запуск приложения](#запуск-приложения)
9. [Проверка работоспособности](#проверка-работоспособности)
10. [Устранение неполадок](#устранение-неполадок)

## Требования

### Минимальные системные требования
- CPU: 2 ядра
- RAM: 4 GB
- Диск: 20 GB SSD
- ОС: Ubuntu 20.04 LTS или выше

### Необходимое ПО
- Python 3.8+
- PostgreSQL 14+
- Redis 6+
- Node.js 14+
- npm 6+
- Nginx
- Docker и Docker Compose (опционально)

## Подготовка окружения

### 1. Клонирование репозитория
```bash
git clone https://github.com/your-username/seka-card-game.git
cd seka-card-game
```

### 2. Создание виртуального окружения
```bash
# Linux/macOS
python -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
.\venv\Scripts\activate
```

### 3. Создание пользователя для приложения
```bash
sudo useradd -m -s /bin/bash seka
sudo usermod -aG sudo seka
sudo chown -R seka:seka /var/www/seka-game
```

## Установка зависимостей

### 1. Python зависимости
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt  # для разработки
```

### 2. Node.js зависимости
```bash
npm install
```

### 3. Системные зависимости
```bash
sudo apt update
sudo apt install -y \
    postgresql \
    postgresql-contrib \
    redis-server \
    nginx \
    certbot \
    python3-certbot-nginx \
    fail2ban \
    ufw
```

## Настройка базы данных

### 1. Создание базы данных и пользователя
```bash
sudo -u postgres psql -c "CREATE USER seka_user WITH PASSWORD 'your-secure-password';"
sudo -u postgres psql -c "CREATE DATABASE seka_game OWNER seka_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE seka_game TO seka_user;"
```

### 2. Настройка PostgreSQL
```bash
# Копирование конфигурационных файлов
sudo cp postgresql/postgresql.conf /etc/postgresql/14/main/
sudo cp postgresql/pg_hba.conf /etc/postgresql/14/main/

# Перезапуск PostgreSQL
sudo systemctl restart postgresql
```

## Настройка Redis

### 1. Настройка конфигурации
```bash
# Копирование конфигурационного файла
sudo cp redis/redis.conf /etc/redis/redis.conf

# Перезапуск Redis
sudo systemctl restart redis-server
```

## Настройка Nginx

### 1. Установка конфигурации
```bash
# Копирование конфигурационного файла
sudo cp nginx/seka-game.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/seka-game.conf /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # удаление дефолтной конфигурации

# Проверка конфигурации
sudo nginx -t

# Перезапуск Nginx
sudo systemctl restart nginx
```

## Настройка SSL

### 1. Получение SSL сертификата
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 2. Настройка автоматического обновления
```bash
sudo certbot renew --dry-run
```

## Запуск приложения

### Вариант 1: Запуск через systemd

1. Копирование конфигурации systemd
```bash
sudo cp systemd/seka-game.service /etc/systemd/system/
```

2. Запуск сервиса
```bash
sudo systemctl daemon-reload
sudo systemctl enable seka-game
sudo systemctl start seka-game
```

### Вариант 2: Запуск через Supervisor

1. Установка Supervisor
```bash
sudo apt install supervisor
```

2. Копирование конфигурации
```bash
sudo cp supervisor/seka-game.conf /etc/supervisor/conf.d/
```

3. Запуск Supervisor
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start seka-game
```

### Вариант 3: Запуск через Docker

1. Сборка и запуск контейнеров
```bash
docker-compose -f docker/docker-compose.yml up -d
```

## Проверка работоспособности

### 1. Проверка сервисов
```bash
# Проверка статуса приложения
sudo systemctl status seka-game
# или
sudo supervisorctl status seka-game
# или
docker-compose -f docker/docker-compose.yml ps

# Проверка логов
tail -f /var/log/seka-game/app.log
```

### 2. Проверка веб-интерфейса
- Откройте в браузере: `https://your-domain.com`
- Проверьте SSL сертификат
- Проверьте работу WebSocket соединения

### 3. Проверка API
```bash
curl -X GET https://your-domain.com/api/health
```

## Устранение неполадок

### 1. Проблемы с базой данных
```bash
# Проверка подключения
psql -U seka_user -d seka_game -h localhost

# Проверка логов
tail -f /var/log/postgresql/postgresql-14-main.log
```

### 2. Проблемы с Redis
```bash
# Проверка подключения
redis-cli ping

# Проверка логов
tail -f /var/log/redis/redis-server.log
```

### 3. Проблемы с Nginx
```bash
# Проверка конфигурации
sudo nginx -t

# Проверка логов
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### 4. Проблемы с приложением
```bash
# Проверка логов приложения
tail -f /var/log/seka-game/app.log

# Проверка системных логов
journalctl -u seka-game -f
```

### 5. Проблемы с SSL
```bash
# Проверка сертификатов
sudo certbot certificates

# Принудительное обновление
sudo certbot renew --force-renewal
```

## Дополнительная информация

- [Документация по API](API.md)
- [Руководство по установке](INSTALLATION.md)
- [Руководство по развертыванию](DEPLOYMENT.md)
- [Руководство по разработке](DEVELOPMENT.md)
- [Руководство по тестированию](TESTING.md) 