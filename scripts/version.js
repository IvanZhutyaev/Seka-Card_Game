import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Получение текущей версии
function getCurrentVersion() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
  );
  return packageJson.version;
}

// Обновление версии
function updateVersion(type) {
  const currentVersion = getCurrentVersion();
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    default:
      throw new Error('Invalid version type');
  }
  
  // Обновление package.json
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
  );
  packageJson.version = newVersion;
  fs.writeFileSync(
    path.join(__dirname, '..', 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Обновление CHANGELOG.md
  execSync('npm run changelog', { stdio: 'inherit' });
  
  // Создание тега
  execSync(`git tag -a v${newVersion} -m "Version ${newVersion}"`, { stdio: 'inherit' });
  
  return newVersion;
}

// Основная функция
function main() {
  const type = process.argv[2];
  if (!type || !['major', 'minor', 'patch'].includes(type)) {
    console.error('Please specify version type: major, minor, or patch');
    process.exit(1);
  }
  
  try {
    const newVersion = updateVersion(type);
    console.log(`Version updated to ${newVersion}`);
  } catch (error) {
    console.error('Error updating version:', error);
    process.exit(1);
  }
}

main(); 