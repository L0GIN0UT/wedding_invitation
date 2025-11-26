# Инструкция по развертыванию проекта на хостинге

## Что нужно арендовать

### 1. VPS (Виртуальный сервер)
- **Минимальные требования**: 2 CPU, 4 GB RAM, 20 GB SSD
- **Рекомендуемые**: 4 CPU, 8 GB RAM, 40 GB SSD
- **ОС**: Ubuntu 22.04 LTS или Debian 12
- **Провайдер**: Timeweb VPS или любой другой (Hetzner, DigitalOcean, AWS, etc.)

### 2. Домен и SSL сертификаты
- У вас уже есть домен и SSL сертификаты на Timeweb
- Нужно будет загрузить сертификаты на сервер

## Подготовка сервера

### 1. Установка Docker и Docker Compose

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo apt install docker-compose-plugin -y

# Перезагрузка (опционально, для применения изменений группы)
# sudo reboot
```

### 2. Клонирование проекта на сервер

```bash
# Перейдите в домашнюю директорию
cd ~

# Клонируйте репозиторий (или загрузите файлы через SFTP)
git clone <ваш-репозиторий> wedding_invitation
cd wedding_invitation
```

### 3. Настройка SSL сертификатов

```bash
# Создайте директорию для SSL сертификатов
mkdir -p ssl

# Загрузите ваши SSL сертификаты в директорию ssl/
# Обычно это два файла:
# - cert.pem (или fullchain.pem) - сертификат
# - key.pem (или privkey.pem) - приватный ключ

# Установите правильные права доступа
chmod 600 ssl/key.pem
chmod 644 ssl/cert.pem
```

**Важно**: 
- Если у вас сертификаты в формате `.crt` и `.key`, переименуйте их в `cert.pem` и `key.pem`
- Если у вас `fullchain.pem` и `privkey.pem`, переименуйте их соответственно

### 4. Настройка переменных окружения

```bash
# Скопируйте пример файла .env
cp .env.example .env

# Отредактируйте .env файл
nano .env
```

**Обязательно обновите следующие переменные для продакшена:**

```env
# База данных
DB_USER=your_db_user
DB_PASSWORD=your_strong_password
DB_NAME=wedding_db
DB_HOST=postgres

# Redis
REDIS_PASSWORD=your_redis_password

# JWT
SECRET_KEY=your_very_long_and_random_secret_key_here
SECRET_ALGORITHM=HS256

# OAuth2 (если используете)
VK_CLIENT_ID=your_vk_client_id
VK_CLIENT_SECRET=your_vk_client_secret
YANDEX_CLIENT_ID=your_yandex_client_id
YANDEX_CLIENT_SECRET=your_yandex_client_secret

# Zvonok.com
ZVONOK_API_KEY=your_zvonok_api_key
ZVONOK_CAMPAIGN_ID=your_zvonok_campaign_id

# pgAdmin (опционально, для доступа к БД)
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=your_pgadmin_password
PGADMIN_PORT=5050
```

**Генерация SECRET_KEY:**
```bash
# Сгенерируйте безопасный ключ
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 5. Настройка домена

В панели управления доменом на Timeweb:
1. Настройте A-запись, указывающую на IP-адрес вашего VPS
2. Или настройте CNAME, если используете поддомен

Пример:
```
A запись: @ -> ваш.IP.адрес.сервера
A запись: www -> ваш.IP.адрес.сервера
```

### 6. Обновление Nginx конфигурации для вашего домена

Отредактируйте `Source/Nginx/nginx.conf` и замените `server_name _;` на ваш домен:

```nginx
server_name yourdomain.com www.yourdomain.com;
```

## Развертывание

### 1. Сборка и запуск контейнеров

```bash
# Перейдите в директорию Source
cd Source

# Соберите и запустите все контейнеры
docker compose up -d --build

# Проверьте статус контейнеров
docker compose ps

# Просмотрите логи (если нужно)
docker compose logs -f
```

### 2. Проверка работы

```bash
# Проверьте, что все контейнеры запущены
docker compose ps

# Проверьте логи Nginx
docker compose logs nginx

# Проверьте логи API
docker compose logs api

# Проверьте логи Frontend
docker compose logs frontend
```

### 3. Открытие портов в файрволе

```bash
# Установите UFW (если еще не установлен)
sudo apt install ufw -y

# Разрешите SSH (важно сделать первым!)
sudo ufw allow 22/tcp

# Разрешите HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включите файрвол
sudo ufw enable

# Проверьте статус
sudo ufw status
```

## Обновление проекта

```bash
# Остановите контейнеры
docker compose down

# Обновите код (если используете git)
git pull

# Пересоберите и запустите
docker compose up -d --build
```

## Резервное копирование

### Бэкап базы данных

```bash
# Создайте бэкап
docker compose exec postgres pg_dump -U your_db_user your_db_name > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из бэкапа
docker compose exec -T postgres psql -U your_db_user your_db_name < backup_20241126_120000.sql
```

### Бэкап Redis (опционально)

```bash
# Redis данные хранятся в volume, можно скопировать
docker compose exec redis redis-cli SAVE
```

## Мониторинг и логи

```bash
# Просмотр всех логов
docker compose logs -f

# Логи конкретного сервиса
docker compose logs -f api
docker compose logs -f nginx
docker compose logs -f celery_worker

# Использование ресурсов
docker stats
```

## Решение проблем

### Контейнеры не запускаются
```bash
# Проверьте логи
docker compose logs

# Проверьте .env файл
cat .env

# Проверьте доступность портов
sudo netstat -tulpn | grep -E ':(80|443|8000)'
```

### SSL сертификаты не работают
```bash
# Проверьте, что файлы существуют
ls -la ssl/

# Проверьте права доступа
chmod 600 ssl/key.pem
chmod 644 ssl/cert.pem

# Проверьте логи Nginx
docker compose logs nginx | grep ssl
```

### База данных не инициализируется
```bash
# Проверьте логи PostgreSQL
docker compose logs postgres

# Удалите volume и пересоздайте (ВНИМАНИЕ: удалит все данные!)
docker compose down -v
docker compose up -d postgres
```

## Безопасность

1. **Измените все пароли** в `.env` файле на сильные
2. **Не коммитьте `.env`** в git
3. **Ограничьте доступ к pgAdmin** - используйте VPN или SSH туннель
4. **Регулярно обновляйте** систему и Docker образы
5. **Настройте автоматические бэкапы** базы данных

## Дополнительные настройки

### Автозапуск при перезагрузке сервера

Docker Compose уже настроен с `restart: always`, но убедитесь, что Docker запускается при загрузке:

```bash
sudo systemctl enable docker
```

### Настройка автоматических обновлений (опционально)

```bash
# Установите unattended-upgrades
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Контакты и поддержка

Если возникнут проблемы:
1. Проверьте логи: `docker compose logs`
2. Проверьте статус контейнеров: `docker compose ps`
3. Проверьте использование ресурсов: `docker stats`

