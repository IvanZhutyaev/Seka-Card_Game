# Руководство по развертыванию Seka Card Game

## Подготовка к развертыванию

### 1. Требования к серверу

#### Минимальные требования
- CPU: 2 ядра
- RAM: 4 GB
- Диск: 20 GB SSD
- ОС: Ubuntu 20.04 LTS

#### Рекомендуемые требования
- CPU: 4 ядра
- RAM: 8 GB
- Диск: 40 GB SSD
- ОС: Ubuntu 22.04 LTS

### 2. Установка необходимого ПО

```bash
# Обновление системы
sudo apt update
sudo apt upgrade -y

# Установка базовых инструментов
sudo apt install -y git curl wget build-essential

# Установка Python
sudo apt install -y python3.8 python3.8-venv python3.8-dev

# Установка PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Установка Redis
sudo apt install -y redis-server

# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Установка PM2
sudo npm install -g pm2
```

### 3. Настройка базы данных

```bash
# Создание пользователя и базы данных
sudo -u postgres psql -c "CREATE USER seka_user WITH PASSWORD 'your-secure-password';"
sudo -u postgres psql -c "CREATE DATABASE seka_game OWNER seka_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE seka_game TO seka_user;"
```

### 4. Настройка Redis

```bash
# Редактирование конфигурации Redis
sudo nano /etc/redis/redis.conf

# Изменение следующих параметров:
# bind 127.0.0.1
# protected-mode yes
# maxmemory 2gb
# maxmemory-policy allkeys-lru

# Перезапуск Redis
sudo systemctl restart redis-server
```

## Развертывание приложения

### 1. Клонирование репозитория

```bash
# Создание директории для приложения
sudo mkdir -p /var/www/seka-game
sudo chown $USER:$USER /var/www/seka-game

# Клонирование репозитория
git clone https://github.com/your-username/seka-card-game.git /var/www/seka-game
cd /var/www/seka-game
```

### 2. Настройка окружения

```bash
# Создание виртуального окружения
python3 -m venv venv
source venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt
npm install

# Создание файла конфигурации
cp .env.example .env
nano .env
```

### 3. Настройка Nginx

```bash
# Установка Nginx
sudo apt install -y nginx

# Создание конфигурации
sudo nano /etc/nginx/sites-available/seka-game

# Добавление конфигурации
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}

# Активация конфигурации
sudo ln -s /etc/nginx/sites-available/seka-game /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Настройка SSL (Let's Encrypt)

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение SSL сертификата
sudo certbot --nginx -d your-domain.com

# Настройка автоматического обновления
sudo certbot renew --dry-run
```

### 5. Настройка PM2

```bash
# Создание конфигурации PM2
nano ecosystem.config.js

# Добавление конфигурации
module.exports = {
  apps: [{
    name: 'seka-game',
    script: 'server.py',
    interpreter: '/var/www/seka-game/venv/bin/python',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

# Запуск приложения
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Настройка брандмауэра

```bash
# Настройка UFW
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## Мониторинг и обслуживание

### 1. Мониторинг приложения

```bash
# Просмотр логов
pm2 logs seka-game

# Мониторинг ресурсов
pm2 monit

# Статус приложения
pm2 status
```

### 2. Резервное копирование

```bash
# Создание скрипта резервного копирования
nano /var/www/seka-game/scripts/backup.sh

# Добавление скрипта
#!/bin/bash
BACKUP_DIR="/var/backups/seka-game"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/seka-game_$TIMESTAMP.sql"

# Создание резервной копии базы данных
pg_dump -U seka_user seka_game > $BACKUP_FILE

# Сжатие резервной копии
gzip $BACKUP_FILE

# Удаление старых резервных копий (старше 7 дней)
find $BACKUP_DIR -name "seka-game_*.sql.gz" -mtime +7 -delete

# Добавление в crontab
chmod +x /var/www/seka-game/scripts/backup.sh
(crontab -l 2>/dev/null; echo "0 0 * * * /var/www/seka-game/scripts/backup.sh") | crontab -
```

### 3. Обновление приложения

```bash
# Создание скрипта обновления
nano /var/www/seka-game/scripts/update.sh

# Добавление скрипта
#!/bin/bash
cd /var/www/seka-game

# Получение обновлений
git pull origin main

# Активация виртуального окружения
source venv/bin/activate

# Обновление зависимостей
pip install -r requirements.txt
npm install

# Применение миграций
python scripts/migrate_db.py

# Перезапуск приложения
pm2 restart seka-game

# Добавление в crontab
chmod +x /var/www/seka-game/scripts/update.sh
```

## Масштабирование

### 1. Горизонтальное масштабирование

```bash
# Настройка балансировщика нагрузки (HAProxy)
sudo apt install -y haproxy

# Конфигурация HAProxy
sudo nano /etc/haproxy/haproxy.cfg

# Добавление конфигурации
frontend seka_frontend
    bind *:80
    default_backend seka_backend

backend seka_backend
    balance roundrobin
    server seka1 127.0.0.1:3000 check
    server seka2 127.0.0.1:3001 check
    server seka3 127.0.0.1:3002 check
```

### 2. Вертикальное масштабирование

```bash
# Настройка PM2 для использования всех ядер
pm2 scale seka-game 4

# Настройка Redis для использования большего объема памяти
sudo nano /etc/redis/redis.conf
# maxmemory 4gb
```

## Безопасность

### 1. Настройка файрвола

```bash
# Настройка правил UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### 2. Настройка fail2ban

```bash
# Установка fail2ban
sudo apt install -y fail2ban

# Настройка конфигурации
sudo nano /etc/fail2ban/jail.local

# Добавление правил
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

### 3. Регулярные обновления

```bash
# Настройка автоматических обновлений
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Дополнительная информация

- [Документация по API](API.md)
- [Руководство по установке](INSTALLATION.md)
- [Руководство по разработке](DEVELOPMENT.md)
- [Руководство по тестированию](TESTING.md) 