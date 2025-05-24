import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Конфигурация деплоя
const config = {
  distDir: path.join(__dirname, '..', 'dist'),
  serverDir: process.env.DEPLOY_PATH || '/var/www/seka-card-game',
  backupDir: process.env.BACKUP_PATH || '/var/www/backups/seka-card-game'
};

// Создание бэкапа
function createBackup() {
  console.log('📦 Creating backup...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(config.backupDir, `backup-${timestamp}`);
  
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
  }
  
  if (fs.existsSync(config.serverDir)) {
    execSync(`cp -r ${config.serverDir} ${backupPath}`);
    console.log('✅ Backup created successfully');
  }
}

// Деплой файлов
function deployFiles() {
  console.log('🚀 Deploying files...');
  
  // Создаем директорию если её нет
  if (!fs.existsSync(config.serverDir)) {
    fs.mkdirSync(config.serverDir, { recursive: true });
  }
  
  // Копируем файлы
  execSync(`cp -r ${config.distDir}/* ${config.serverDir}/`);
  console.log('✅ Files deployed successfully');
}

// Основная функция деплоя
async function deploy() {
  try {
    console.log('🚀 Starting deployment...');
    
    // Создание бэкапа
    createBackup();
    
    // Деплой файлов
    deployFiles();
    
    console.log('✨ Deployment completed successfully!');
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Запуск деплоя
deploy(); 