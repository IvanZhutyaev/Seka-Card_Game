# Используем официальный образ Python
FROM python:3.8-slim

# Устанавливаем рабочую директорию
WORKDIR /var/www/seka-game

# Устанавливаем зависимости системы
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Копируем файлы зависимостей
COPY requirements.txt .
COPY requirements-dev.txt .

# Устанавливаем Python зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем исходный код
COPY . .

# Создаем пользователя без прав root
RUN useradd -m seka && \
    chown -R seka:seka /var/www/seka-game

# Переключаемся на пользователя seka
USER seka

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["python", "server.py"] 