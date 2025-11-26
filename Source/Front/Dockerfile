# Этап 1: Сборка React приложения
FROM node:20-alpine AS build

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --legacy-peer-deps --force

# Принудительно устанавливаем совместимые версии ajv-keywords для ajv 6.x
# Версия 3.2.0 точно работает с ajv 6.x и schema-utils
RUN npm install ajv-keywords@3.2.0 --legacy-peer-deps --force --no-save

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Этап 2: Nginx для статических файлов
FROM nginx:alpine

# Копируем собранные файлы из этапа сборки
COPY --from=build /app/build /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт 80
EXPOSE 80

# Nginx запускается автоматически
CMD ["nginx", "-g", "daemon off;"]

