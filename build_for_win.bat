@echo off
chcp 65001
setlocal enabledelayedexpansion

echo ===================================
echo Начинаем процесс сборки React приложения
echo ===================================

REM --- Установка путей к Node.js ---
set "NODE_PATH=C:\Program Files\nodejs"
set "PATH=%PATH%;%NODE_PATH%"

echo. 
echo Текущий путь: %CD%
echo Путь к Node.js: %NODE_PATH%
echo.

REM --- Проверка наличия Node.js ---
echo Проверка наличия Node.js...
if not exist "%NODE_PATH%\node.exe" (
    echo ОШИБКА: Node.js не найден в стандартном месте.
    echo Пожалуйста, убедитесь, что Node.js установлен или укажите правильный путь.
    pause
    exit /b 1
)
echo Node.js найден: "%NODE_PATH%\node.exe"
call "%NODE_PATH%\node.exe" --version

echo. 
echo --- Проверка Node.js завершена. ---
echo.

REM --- Проверка версии npm ---
echo Проверка версии npm...
call "%NODE_PATH%\npm.cmd" --version
if %ERRORLEVEL% neq 0 (
    echo ОШИБКА: Проблема с npm!
    echo Пожалуйста, убедитесь, что npm установлен корректно.
    pause
    exit /b 1
)

echo. 
echo --- Проверка npm завершена. ---
echo.

REM --- Очистка предыдущей сборки ---
echo Очистка предыдущей сборки...
if exist build rmdir /s /q build
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo. 
echo --- Очистка завершена. ---
echo.

REM --- Установка зависимостей ---
echo Установка зависимостей...
echo Выполняется команда: "%NODE_PATH%\npm.cmd" install --no-audit --no-fund
call "%NODE_PATH%\npm.cmd" install --no-audit --no-fund
if %ERRORLEVEL% neq 0 (
    echo ОШИБКА: Ошибка при установке зависимостей!
    echo Попытка очистить кэш npm и повторить установку...
    call "%NODE_PATH%\npm.cmd" cache clean --force
    call "%NODE_PATH%\npm.cmd" install --no-audit --no-fund
    if %ERRORLEVEL% neq 0 (
        echo КРИТИЧЕСКАЯ ОШИБКА: Не удалось установить зависимости после повторной попытки!
        pause
        exit /b 1
    )
)

echo. 
echo --- Установка зависимостей завершена. ---
echo.

REM --- Сборка проекта ---
echo Сборка проекта...
echo Выполняется команда: "%NODE_PATH%\npm.cmd" run build
call "%NODE_PATH%\npm.cmd" run build
if %ERRORLEVEL% neq 0 (
    echo ОШИБКА: Ошибка при сборке проекта!
    echo Пожалуйста, проверьте сообщения об ошибках выше.
    pause
    exit /b 1
)

echo. 
echo --- Сборка React приложения завершена. ---
echo.

REM --- Проверка наличия основных файлов ---
echo Проверка наличия основных файлов сборки...
if not exist build\index.html echo ОШИБКА: index.html не найден в папке build!
if not exist build\static echo ОШИБКА: папка static не найдена в папке build!
if not exist build\asset-manifest.json echo ОШИБКА: asset-manifest.json не найден в папке build!

echo. 
echo --- Проверка файлов сборки завершена. ---
echo.

REM --- Финальное сообщение ---
echo ===================================
echo Сборка React приложения завершена.
echo Проверьте папку 'build' для результатов.
echo ===================================

pause