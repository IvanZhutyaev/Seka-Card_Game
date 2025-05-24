import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Конфигурация сборки
const config = {
  outdir: 'dist',
  entryPoints: [
    'public/js/app.js',
    'public/js/components/*.js',
    'public/js/services/*.js'
  ],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: ['es2020'],
  format: 'esm',
  plugins: [
    sassPlugin({
      type: 'css',
      cssImports: true
    })
  ]
};

// Очистка директории сборки
function cleanBuild() {
  console.log('🧹 Cleaning build directory...');
  if (fs.existsSync(config.outdir)) {
    fs.rmSync(config.outdir, { recursive: true, force: true });
  }
  fs.mkdirSync(config.outdir);
}

// Копирование статических файлов
async function copyStaticFiles() {
  console.log('📁 Copying static files...');
  const staticFiles = await glob('public/**/*', { ignore: ['**/*.scss', '**/*.js'] });
  
  for (const file of staticFiles) {
    const stats = fs.statSync(file);
    if (stats.isFile()) {
      const dest = path.join(config.outdir, file.replace('public/', ''));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(file, dest);
    }
  }
}

// Сборка JavaScript и CSS
async function buildAssets() {
  console.log('🔨 Building assets...');
  try {
    await esbuild.build({
      ...config,
      outdir: path.join(config.outdir, 'assets'),
      entryPoints: [
        'public/js/app.js',
        'public/css/styles.scss'
      ]
    });
    console.log('✅ Assets built successfully');
  } catch (error) {
    console.error('❌ Error building assets:', error);
    process.exit(1);
  }
}

// Сборка модулей
async function buildModules() {
  console.log('🔨 Building modules...');
  try {
    await esbuild.build({
      ...config,
      outdir: path.join(config.outdir, 'js'),
      entryPoints: config.entryPoints
    });
    console.log('✅ Modules built successfully');
  } catch (error) {
    console.error('❌ Error building modules:', error);
    process.exit(1);
  }
}

// Создание HTML файлов
async function buildHtml() {
  console.log('📄 Building HTML files...');
  const pages = await glob('pages/**/*.html');
  
  for (const page of pages) {
    const content = fs.readFileSync(page, 'utf8');
    const dest = path.join(config.outdir, page.replace('pages/', ''));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
}

// Основная функция сборки
async function build() {
  try {
    console.log('🚀 Starting build process...');
    
    // Очистка
    cleanBuild();
    
    // Копирование статических файлов
    await copyStaticFiles();
    
    // Сборка ассетов
    await buildAssets();
    
    // Сборка модулей
    await buildModules();
    
    // Сборка HTML
    await buildHtml();
    
    console.log('✨ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Запуск сборки
build(); 