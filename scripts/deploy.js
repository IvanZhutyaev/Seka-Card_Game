const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Загружаем переменные окружения
const envPath = path.resolve(process.cwd(), '.env.deploy');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.deploy file not found');
  process.exit(1);
}

const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Проверяем наличие необходимых ключей
const requiredKeys = ['DEPLOY_KEY', 'API_KEY'];
const missingKeys = requiredKeys.filter(key => !envConfig[key]);

if (missingKeys.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingKeys.join(', ')}`);
  process.exit(1);
}

// Функция для проверки доступа
function checkAccess() {
  try {
    const deployKey = envConfig.DEPLOY_KEY;
    if (!deployKey) {
      throw new Error('DEPLOY_KEY is not set');
    }
    
    // Проверяем формат ключа
    if (!/^[A-Za-z0-9-_]{32,}$/.test(deployKey)) {
      throw new Error('Invalid DEPLOY_KEY format');
    }
    
    return true;
  } catch (error) {
    console.error('Access check failed:', error.message);
    return false;
  }
}

// Функция для создания бэкапа
function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  const backupPath = path.join(backupDir, `backup-${timestamp}.zip`);
  
  try {
    execSync(`zip -r ${backupPath} . -x "node_modules/*" "backups/*" ".git/*"`, {
      stdio: 'inherit'
    });
    console.log(`Backup created: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('Backup creation failed:', error);
    return null;
  }
}

// Функция для деплоя
async function deploy() {
  try {
    // Проверяем доступ
    if (!checkAccess()) {
      throw new Error('Access check failed');
    }
    
    // Создаем бэкап
    const backupPath = createBackup();
    if (!backupPath) {
      throw new Error('Backup creation failed');
    }
    
    // Выполняем деплой
    console.log('Starting deployment...');
    
    // Обновляем зависимости
    execSync('npm install --production', { stdio: 'inherit' });
    
    // Собираем проект
    execSync('npm run build', { stdio: 'inherit' });
    
    // Перезапускаем сервер
    execSync('pm2 restart all', { stdio: 'inherit' });
    
    console.log('Deployment completed successfully');
  } catch (error) {
    console.error('Deployment failed:', error);
    
    // Восстанавливаем из бэкапа при ошибке
    if (backupPath && fs.existsSync(backupPath)) {
      console.log('Restoring from backup...');
      execSync(`unzip -o ${backupPath}`, { stdio: 'inherit' });
      console.log('Restore completed');
    }
    
    process.exit(1);
  }
}

// Запускаем деплой
deploy(); 