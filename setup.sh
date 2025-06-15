#!/bin/bash

# Установка зависимостей
npm install

# Создание необходимых директорий
mkdir -p src/components
mkdir -p src/store
mkdir -p src/types
mkdir -p public

# Установка типов для styled-components
npm install --save-dev @types/styled-components

# Установка React и связанных пакетов
npm install react react-dom @types/react @types/react-dom

# Установка TypeScript
npm install --save-dev typescript @types/node

# Создание tsconfig.json
echo '{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}' > tsconfig.json

# Установка styled-components
npm install styled-components

# Установка zustand для управления состоянием
npm install zustand

echo "Установка завершена. Теперь вы можете запустить приложение командой 'npm start'" 