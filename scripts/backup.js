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

// Функция для создания бэкапа
function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    
    // Создаем директорию для бэкапов если её нет
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    const backupPath = path.join(backupDir, `backup-${timestamp}.zip`);
    
    // Создаем список файлов для исключения
    const excludeList = [
      'node_modules',
      'backups',
      '.git',
      '.env',
      '.env.deploy',
      '*.log'
    ].map(item => `-x "${item}/*"`).join(' ');
    
    // Создаем бэкап
    execSync(`zip -r ${backupPath} . ${excludeList}`, {
      stdio: 'inherit'
    });
    
    console.log(`Backup created successfully: ${backupPath}`);
    
    // Очищаем старые бэкапы (оставляем только последние 5)
    const backups = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-'))
      .sort()
      .reverse();
    
    if (backups.length > 5) {
      backups.slice(5).forEach(file => {
        fs.unlinkSync(path.join(backupDir, file));
        console.log(`Removed old backup: ${file}`);
      });
    }
    
    return backupPath;
  } catch (error) {
    console.error('Backup creation failed:', error);
    return null;
  }
}

// Функция для восстановления из бэкапа
function restoreFromBackup(backupPath) {
  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }
    
    console.log(`Restoring from backup: ${backupPath}`);
    
    // Распаковываем бэкап
    execSync(`unzip -o ${backupPath}`, {
      stdio: 'inherit'
    });
    
    console.log('Restore completed successfully');
    return true;
  } catch (error) {
    console.error('Restore failed:', error);
    return false;
  }
}

// Основная функция
function main() {
  const action = process.argv[2];
  const backupPath = process.argv[3];
  
  switch (action) {
    case 'create':
      createBackup();
      break;
    case 'restore':
      if (!backupPath) {
        console.error('Error: Backup path not specified');
        process.exit(1);
      }
      restoreFromBackup(backupPath);
      break;
    default:
      console.error('Error: Invalid action. Use "create" or "restore"');
      process.exit(1);
  }
}

main(); 