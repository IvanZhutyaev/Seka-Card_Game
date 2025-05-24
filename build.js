import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';
import { glob } from 'glob';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Конфигурация сборки
const config = {
  outdir: 'dist',
  entryPoints: [
    'public/js/app.js',
    'public/js/components/*.{js,ts,tsx}',
    'public/js/services/*.{js,ts}'
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

// Оптимизация изображений
async function optimizeImages() {
  console.log('🖼️ Optimizing images...');
  const images = await glob('public/images/**/*.{jpg,jpeg,png,webp}');
  
  for (const image of images) {
    const stats = fs.statSync(image);
    if (stats.isFile()) {
      const dest = path.join(config.outdir, 'images', path.basename(image));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      
      await sharp(image)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(dest.replace(/\.[^.]+$/, '.webp'));
    }
  }
}

// Копирование статических файлов
async function copyStaticFiles() {
  console.log('📁 Copying static files...');
  const staticFiles = await glob('public/**/*', { 
    ignore: ['**/*.scss', '**/*.js', '**/*.ts', '**/*.tsx', '**/*.{jpg,jpeg,png,webp}'] 
  });
  
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

// Сборка TypeScript
async function buildTypeScript() {
  console.log('🔨 Building TypeScript...');
  try {
    execSync('tsc', { stdio: 'inherit' });
    console.log('✅ TypeScript built successfully');
  } catch (error) {
    console.error('❌ Error building TypeScript:', error);
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

// Создание service worker
async function buildServiceWorker() {
  console.log('🔧 Building service worker...');
  const swContent = `
    const CACHE_NAME = 'seka-cache-v1';
    const urlsToCache = [
      '/',
      '/assets/styles.css',
      '/assets/app.js',
      '/images/logo.webp'
    ];

    self.addEventListener('install', event => {
      event.waitUntil(
        caches.open(CACHE_NAME)
          .then(cache => cache.addAll(urlsToCache))
      );
    });

    self.addEventListener('fetch', event => {
      event.respondWith(
        caches.match(event.request)
          .then(response => response || fetch(event.request))
      );
    });
  `;
  
  fs.writeFileSync(path.join(config.outdir, 'sw.js'), swContent);
}

// Основная функция сборки
async function build() {
  try {
    console.log('🚀 Starting build process...');
    
    // Очистка
    cleanBuild();
    
    // Оптимизация изображений
    await optimizeImages();
    
    // Копирование статических файлов
    await copyStaticFiles();
    
    // Сборка TypeScript
    await buildTypeScript();
    
    // Сборка ассетов
    await buildAssets();
    
    // Сборка модулей
    await buildModules();
    
    // Сборка HTML
    await buildHtml();
    
    // Создание service worker
    await buildServiceWorker();
    
    console.log('✨ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Запуск сборки
build(); 