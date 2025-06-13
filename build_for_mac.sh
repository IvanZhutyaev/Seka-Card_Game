#!/bin/bash

echo "==================================="
echo "Начинаем процесс сборки React приложения"
echo "==================================="

echo ""
echo "Текущий путь: $(pwd)"
echo "Путь к Node.js: $(which node)"
echo ""

# --- Проверка наличия Node.js ---
echo "Проверка наличия Node.js..."
if ! command -v node &> /dev/null; then
    echo "ОШИБКА: Node.js не найден!"
    echo "Пожалуйста, убедитесь, что Node.js установлен."
    read -p "Нажмите [Enter] для продолжения..."
    exit 1
fi
echo "Node.js найден: $(which node)"
node --version

echo ""
echo "--- Проверка Node.js завершена. ---"
echo ""

# --- Проверка версии npm ---
echo "Проверка версии npm..."
npm --version
if [ $? -ne 0 ]; then
    echo "ОШИБКА: Проблема с npm!"
    echo "Пожалуйста, убедитесь, что npm установлен корректно."
    read -p "Нажмите [Enter] для продолжения..."
    exit 1
fi

echo ""
echo "--- Проверка npm завершена. ---"
echo ""

# --- Очистка предыдущей сборки ---
echo "Очистка предыдущей сборки..."
rm -rf build
rm -rf node_modules
rm -f package-lock.json

echo ""
echo "--- Очистка завершена. ---"
echo ""

# --- Установка зависимостей ---
echo "Установка зависимостей..."
echo "Выполняется команда: npm install --no-audit --no-fund"
npm install --no-audit --no-fund
if [ $? -ne 0 ]; then
    echo "ОШИБКА: Ошибка при установке зависимостей!"
    echo "Попытка очистить кэш npm и повторить установку..."
    npm cache clean --force
    npm install --no-audit --no-fund
    if [ $? -ne 0 ]; then
        echo "КРИТИЧЕСКАЯ ОШИБКА: Не удалось установить зависимости после повторной попытки!"
        read -p "Нажмите [Enter] для продолжения..."
        exit 1
    fi
fi

echo ""
echo "--- Установка зависимостей завершена. ---"
echo ""

# --- Сборка проекта ---
echo "Сборка проекта..."
echo "Выполняется команда: npm run build"
npm run build
if [ $? -ne 0 ]; then
    echo "ОШИБКА: Ошибка при сборке проекта!"
    echo "Пожалуйста, проверьте сообщения об ошибках выше."
    read -p "Нажмите [Enter] для продолжения..."
    exit 1
fi

echo ""
echo "--- Сборка React приложения завершена. ---"
echo ""

# --- Проверка наличия основных файлов ---
echo "Проверка наличия основных файлов сборки..."
if [ ! -f "build/index.html" ]; then echo "ОШИБКА: index.html не найден в папке build!"; fi
if [ ! -d "build/static" ]; then echo "ОШИБКА: папка static не найдена в папке build!"; fi
if [ ! -f "build/asset-manifest.json" ]; then echo "ОШИБКА: asset-manifest.json не найден в папке build!"; fi

echo ""
echo "--- Проверка файлов сборки завершена. ---"
echo ""

# --- Финальное сообщение ---
echo "==================================="
echo "Сборка React приложения завершена."
echo "Проверьте папку 'build' для результатов."
echo "==================================="

read -p "Нажмите [Enter] для завершения..."