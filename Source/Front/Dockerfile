FROM nginx:alpine

# Копируем HTML файлы
COPY tets/ /usr/share/nginx/html/tets/

# Копируем конфигурацию nginx (опционально, для настройки CORS и т.д.)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт 80
EXPOSE 80

# Nginx запускается автоматически
CMD ["nginx", "-g", "daemon off;"]

