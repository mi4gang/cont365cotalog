# Инструкция по развертыванию ContCatLog

Это приложение **полностью независимо от Manus** и может быть развернуто на любом хостинге с поддержкой Node.js и MySQL.

## Системные требования

- **Node.js**: 18.x или выше
- **MySQL**: 8.0 или выше
- **pnpm**: 8.x или выше (или npm/yarn)
- **Операционная система**: Linux (Ubuntu/Debian рекомендуется)

---

## Шаг 1: Подготовка сервера

### 1.1 Установка Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка версии
node --version  # Должно быть v18+ или v20+
```

### 1.2 Установка pnpm

```bash
npm install -g pnpm
```

### 1.3 Установка MySQL

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y mysql-server

# Запуск MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Создание базы данных
sudo mysql -u root -p
```

В консоли MySQL:

```sql
CREATE DATABASE contcatlog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'contcatlog_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON contcatlog.* TO 'contcatlog_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## Шаг 2: Загрузка проекта

```bash
# Клонирование репозитория (если используется Git)
git clone <your-repo-url> /var/www/contcatlog
cd /var/www/contcatlog

# Или загрузка архива
# Распакуйте файлы в /var/www/contcatlog
```

---

## Шаг 3: Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```bash
nano .env
```

Добавьте следующие переменные:

```env
# База данных
DATABASE_URL=mysql://contcatlog_user:your_secure_password@localhost:3306/contcatlog

# JWT секрет для сессий (сгенерируйте случайную строку)
JWT_SECRET=your_random_secret_key_here_min_32_chars

# Режим работы
NODE_ENV=production

# Порт (по умолчанию 3000)
PORT=3000
```

**Важно**: Замените `your_secure_password` и `JWT_SECRET` на свои значения!

Для генерации безопасного JWT_SECRET:

```bash
openssl rand -base64 32
```

---

## Шаг 4: Установка зависимостей

```bash
pnpm install
```

---

## Шаг 5: Инициализация базы данных

```bash
# Применить миграции схемы
pnpm db:push
```

---

## Шаг 6: Создание первого администратора

После запуска приложения перейдите на:

```
http://your-server-ip:3000/admin/setup
```

Введите логин и пароль для первого администратора. Эта страница будет доступна **только один раз** (пока нет админов в базе).

**Важно**: После создания администратора вход в админку осуществляется через:
```
http://your-server-ip:3000/admin
```

Главная страница (`/`) теперь сразу показывает каталог контейнеров (без промежуточной страницы).

---

## Шаг 7: Сборка для продакшена

```bash
# Сборка фронтенда
pnpm build
```

---

## Шаг 8: Запуск приложения

### Вариант A: Запуск через PM2 (рекомендуется)

PM2 - менеджер процессов для Node.js, автоматически перезапускает приложение при сбоях.

```bash
# Установка PM2
npm install -g pm2

# Запуск приложения
pm2 start server/_core/index.ts --name contcatlog --interpreter tsx

# Автозапуск при перезагрузке сервера
pm2 startup
pm2 save

# Просмотр логов
pm2 logs contcatlog

# Перезапуск
pm2 restart contcatlog

# Остановка
pm2 stop contcatlog
```

### Вариант B: Запуск через systemd

Создайте файл сервиса:

```bash
sudo nano /etc/systemd/system/contcatlog.service
```

Содержимое:

```ini
[Unit]
Description=ContCatLog Container Catalog
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/contcatlog
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/node /var/www/contcatlog/server/_core/index.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Запуск:

```bash
sudo systemctl daemon-reload
sudo systemctl start contcatlog
sudo systemctl enable contcatlog

# Просмотр статуса
sudo systemctl status contcatlog

# Просмотр логов
sudo journalctl -u contcatlog -f
```

---

## Шаг 9: Настройка Nginx (опционально, для домена)

Если вы хотите использовать домен и SSL:

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Создайте конфигурацию Nginx:

```bash
sudo nano /etc/nginx/sites-available/contcatlog
```

Содержимое:

```nginx
server {
    listen 80;
    server_name container365.ru www.container365.ru;

    # Статические файлы (фото контейнеров)
    location /uploads/ {
        alias /var/www/contcatlog/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Проксирование на Node.js приложение
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активация конфигурации:

```bash
sudo ln -s /etc/nginx/sites-available/contcatlog /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Установка SSL сертификата (Let's Encrypt):

```bash
sudo certbot --nginx -d container365.ru -d www.container365.ru
```

---

## Шаг 10: Настройка брандмауэра

```bash
# Разрешить HTTP и HTTPS
sudo ufw allow 'Nginx Full'

# Или если не используете Nginx
sudo ufw allow 3000/tcp

# Включить брандмауэр
sudo ufw enable
```

---

## Обновление приложения

```bash
cd /var/www/contcatlog

# Получить новую версию (Git)
git pull origin main

# Установить новые зависимости
pnpm install

# Применить миграции базы данных
pnpm db:push

# Пересобрать фронтенд
pnpm build

# Перезапустить приложение
pm2 restart contcatlog
# или
sudo systemctl restart contcatlog
```

---

## Резервное копирование

### База данных

```bash
# Создание бэкапа
mysqldump -u contcatlog_user -p contcatlog > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление
mysql -u contcatlog_user -p contcatlog < backup_20260119_120000.sql
```

### Фотографии контейнеров

```bash
# Создание архива
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz /var/www/contcatlog/uploads/

# Восстановление
tar -xzf uploads_backup_20260119.tar.gz -C /var/www/contcatlog/
```

---

## Мониторинг и логи

### PM2

```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs contcatlog

# Мониторинг в реальном времени
pm2 monit
```

### systemd

```bash
# Статус
sudo systemctl status contcatlog

# Логи
sudo journalctl -u contcatlog -f

# Последние 100 строк логов
sudo journalctl -u contcatlog -n 100
```

---

## Решение проблем

### Приложение не запускается

1. Проверьте логи: `pm2 logs` или `sudo journalctl -u contcatlog`
2. Проверьте переменные окружения в `.env`
3. Убедитесь, что MySQL запущен: `sudo systemctl status mysql`
4. Проверьте подключение к базе: `mysql -u contcatlog_user -p`

### Фотографии не загружаются

1. Проверьте права доступа к папке `/var/www/contcatlog/uploads/`:
   ```bash
   sudo chown -R www-data:www-data /var/www/contcatlog/uploads/
   sudo chmod -R 755 /var/www/contcatlog/uploads/
   ```

2. Проверьте, что Nginx правильно проксирует `/uploads/`

### База данных не подключается

1. Проверьте `DATABASE_URL` в `.env`
2. Убедитесь, что пользователь MySQL имеет права:
   ```sql
   SHOW GRANTS FOR 'contcatlog_user'@'localhost';
   ```

---

## Контакты и поддержка

Если возникли проблемы с развертыванием, проверьте:

1. Логи приложения
2. Логи MySQL: `/var/log/mysql/error.log`
3. Логи Nginx: `/var/log/nginx/error.log`

---

## Архитектура приложения

- **Frontend**: React 19 + Vite + Tailwind CSS
- **Backend**: Express 4 + tRPC 11
- **Database**: MySQL 8.0+ (через Drizzle ORM)
- **Storage**: Локальная файловая система (`/uploads`)
- **Authentication**: JWT-based session cookies (локальный логин/пароль)

**Никаких внешних зависимостей от Manus или других сервисов!**
