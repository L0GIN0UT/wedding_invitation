# Этап 1: Сборка Vite приложения
FROM node:20-slim AS build

WORKDIR /app

# Копируем package.json
COPY package.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Собираем приложение (Vite создает папку dist)
RUN npm run build

# Этап 2: Nginx для статических файлов
FROM nginx:alpine

# Копируем собранные файлы из этапа сборки (Vite использует dist вместо build)
COPY --from=build /app/dist /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт 80
EXPOSE 80

# Nginx запускается автоматически
CMD ["nginx", "-g", "daemon off;"]

