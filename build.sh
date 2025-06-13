#!/bin/bash

# Проверка наличия Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js не установлен. Пожалуйста, установите Node.js с https://nodejs.org/"
    exit 1
fi

# Проверка наличия npm
if ! command -v npm &> /dev/null; then
    echo "npm не установлен. Пожалуйста, установите Node.js с https://nodejs.org/"
    exit 1
fi

# Установка зависимостей
echo "Установка зависимостей..."
npm install

# Сборка проекта
echo "Сборка проекта..."
npm run build

# Проверка успешности сборки
if [ $? -eq 0 ]; then
    echo "Сборка успешно завершена!"
    echo "Собранные файлы находятся в папке 'build'"
else
    echo "Ошибка при сборке проекта"
    exit 1
fi 