FROM python:3.11-slim

WORKDIR /app

# Копируем requirements и устанавливаем зависимости
COPY Main_back/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код приложения
COPY Main_back/ /app/Main_back/
COPY Notifications/ /app/Notifications/
COPY conf/ /app/conf/

# Устанавливаем переменную окружения
ENV PYTHONPATH=/app

# Открываем порт
EXPOSE 8000

# Запускаем приложение
WORKDIR /app/Main_back
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

