# ContCatLog - Полная техническая инструкция для Firebase Studio

## Обзор архитектуры проекта

### Что это такое?
ContCatLog - это веб-приложение для управления каталогом морских контейнеров. Состоит из трех частей:

1. **Фронтенд** (React 19) - публичный каталог и админ-панель
2. **Бэкенд** (Express + tRPC) - API для работы с данными
3. **База данных** (MySQL) - хранилище контейнеров, фото, пользователей

### Как это работает?
```
Пользователь открывает сайт
         ↓
React приложение загружается в браузер
         ↓
React вызывает tRPC процедуры (вызовы функций на сервере)
         ↓
Express сервер обрабатывает запросы
         ↓
Drizzle ORM работает с MySQL базой
         ↓
Данные возвращаются в React
         ↓
Страница обновляется
```

## Структура файлов проекта

```
contcatlog/
├── client/                          # Фронтенд (React)
│   ├── src/
│   │   ├── pages/                   # Страницы приложения
│   │   │   ├── Home.tsx             # Главная страница
│   │   │   ├── Catalog.tsx          # Публичный каталог контейнеров
│   │   │   ├── ContainerDetail.tsx  # Страница контейнера с фото
│   │   │   └── AdminDashboard.tsx   # Админ-панель (импорт CSV, управление)
│   │   ├── components/              # Переиспользуемые компоненты
│   │   ├── lib/
│   │   │   └── trpc.ts              # Клиент для вызова функций сервера
│   │   ├── App.tsx                  # Маршруты и главный компонент
│   │   └── index.css                # Глобальные стили
│   ├── public/                      # Статические файлы (картинки, иконки)
│   └── index.html                   # HTML шаблон
│
├── server/                          # Бэкенд (Node.js + Express)
│   ├── routers.ts                   # Все функции, которые может вызвать фронтенд
│   ├── db.ts                        # Функции для работы с базой данных
│   ├── auth.logout.test.ts          # Тесты для авторизации
│   └── _core/                       # Внутренние системы
│       ├── context.ts               # Контекст запроса (текущий пользователь)
│       ├── env.ts                   # Переменные окружения
│       └── server.ts                # Инициализация Express сервера
│
├── drizzle/                         # Схема базы данных
│   ├── schema.ts                    # Описание таблиц (контейнеры, фото, пользователи)
│   └── migrations/                  # История изменений БД
│
├── package.json                     # Зависимости проекта
├── tsconfig.json                    # Конфигурация TypeScript
├── vite.config.ts                   # Конфигурация сборки фронтенда
└── drizzle.config.ts                # Конфигурация базы данных
```

## Ключевые компоненты

### 1. Фронтенд (React)

**Как работает:**
- Пользователь открывает сайт в браузере
- React загружает интерфейс
- При клике на кнопку или загрузке данных React вызывает функции на сервере через tRPC

**Основные страницы:**
- `Home.tsx` - главная страница с описанием
- `Catalog.tsx` - список контейнеров с фильтрацией
- `ContainerDetail.tsx` - детальная страница контейнера с галереей фото
- `AdminDashboard.tsx` - админ-панель для управления контейнерами

**Как вызывать сервер из фронтенда:**
```typescript
// Получить список контейнеров
const { data: containers } = trpc.containers.list.useQuery();

// Обновить контейнер
const updateMutation = trpc.containers.update.useMutation();
updateMutation.mutate({ id: 1, name: "Новое имя" });
```

### 2. Бэкенд (Express + tRPC)

**Как работает:**
- Express слушает запросы на порту 3000
- tRPC преобразует вызовы функций в HTTP запросы
- Каждая функция в `routers.ts` - это процедура, которую может вызвать фронтенд

**Основные функции (процедуры):**
```typescript
// server/routers.ts содержит:

// Контейнеры
- containers.list()           // Получить все контейнеры
- containers.getById(id)      // Получить контейнер по ID
- containers.create(data)     // Создать новый контейнер
- containers.update(id, data) // Обновить контейнер
- containers.delete(id)       // Удалить контейнер

// Фотографии
- photos.setMainPhoto(photoId)        // Установить главное фото
- photos.reorderPhotos(photoIds)      // Изменить порядок фото

// CSV импорт
- csvImport.upload(file)              // Загрузить CSV файл
- csvImport.getHistory()              // История импортов

// Авторизация
- auth.me()                           // Получить текущего пользователя
- auth.logout()                       // Выход
```

**Как добавить новую функцию:**
```typescript
// В server/routers.ts добавить:
export const appRouter = router({
  myNewFunction: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      // Твой код здесь
      return { message: `Hello ${input.name}` };
    }),
});

// На фронтенде вызвать:
const { data } = trpc.myNewFunction.useQuery({ name: "World" });
```

### 3. База данных (MySQL)

**Таблицы:**
- `containers` - контейнеры (ID, название, размер, цена, описание)
- `container_photos` - фотографии контейнеров (URL, порядок, главное фото)
- `users` - пользователи (для авторизации админов)
- `import_history` - история загрузок CSV файлов

**Как работает:**
- Drizzle ORM преобразует JavaScript код в SQL запросы
- Все запросы безопасны от SQL инъекций

**Пример добавления контейнера:**
```typescript
// В server/db.ts:
export async function createContainer(data: ContainerInput) {
  const result = await db.insert(containers).values(data).returning();
  return result[0];
}

// На фронтенде:
const createMutation = trpc.containers.create.useMutation();
createMutation.mutate({
  externalId: "FONU123",
  name: "Контейнер #1",
  size: "20 фут",
  price: 50000,
});
```

## Установка и запуск в Firebase Studio

### Шаг 1: Клонирование репозитория
```bash
# Если репозиторий уже в Firebase Studio, перейти в папку проекта
cd contcatlog

# Если нет, клонировать:
git clone <URL_РЕПОЗИТОРИЯ> contcatlog
cd contcatlog
```

### Шаг 2: Установка зависимостей
```bash
# Установить все npm пакеты
pnpm install

# Или если pnpm не установлен:
npm install -g pnpm
pnpm install
```

### Шаг 3: Настройка переменных окружения

Создать файл `.env` в корне проекта:

```env
# ===== БАЗА ДАННЫХ =====
# Строка подключения к MySQL
# Формат: mysql://пользователь:пароль@хост:порт/имя_базы
DATABASE_URL=mysql://root:password@localhost:3306/contcatlog

# ===== СЕРВЕР =====
# Порт, на котором будет запускаться сервер
PORT=3000

# Секретный ключ для JWT токенов (любая длинная строка)
JWT_SECRET=your-super-secret-key-change-this-in-production-12345

# ===== ОПЦИОНАЛЬНО (если нужна аналитика) =====
# VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
# VITE_ANALYTICS_WEBSITE_ID=your-site-id
```

**Где взять значения:**
- `DATABASE_URL` - от администратора MySQL сервера
- `JWT_SECRET` - сгенерировать самому (например: `openssl rand -hex 32`)
- `PORT` - обычно 3000, но можно любой свободный

### Шаг 4: Инициализация базы данных

```bash
# Создать таблицы в базе данных
pnpm db:push

# Проверить, что всё создалось:
# Должна появиться папка drizzle/migrations/ с SQL файлами
```

### Шаг 5: Запуск в режиме разработки

```bash
# Запустить сервер и фронтенд одновременно
pnpm dev

# Сервер будет доступен по адресу: http://localhost:3000
# Фронтенд автоматически откроется в браузере
```

### Шаг 6: Первый вход в админ-панель

1. Открыть http://localhost:3000/admin
2. На странице логина нажать "Создать первого администратора"
3. Ввести логин и пароль (запомнить!)
4. Вход в админ-панель

## Как работает каждая функция

### Импорт CSV файла

**Что происходит:**
1. Пользователь загружает CSV файл в админ-панель
2. Сервер парсит файл (ищет колонки: ID, Название, Размер, Цена, Фото)
3. Для каждого контейнера:
   - Если контейнер с таким ID уже есть → обновляет данные
   - Если нет → создает новый
4. Фотографии добавляются к контейнеру
5. История сохраняется в таблицу `import_history`

**Формат CSV:**
```
ID,Название,Размер,Состояние,Цена,Фото
FONU123,Контейнер #1,20 фут,Б/У,50000,https://example.com/photo1.jpg,https://example.com/photo2.jpg
```

### Управление фотографиями

**Что можно делать:**
1. Перетаскивать фото для изменения порядка (drag-and-drop)
2. Нажать на фото, чтобы сделать его главным (звездочка)
3. Главное фото показывается на карточке в каталоге

**Как это работает:**
- Каждое фото имеет `displayOrder` (1, 2, 3...)
- Каждое фото имеет `isMain` (true/false)
- При изменении порядка обновляется `displayOrder`
- При клике на фото обновляется `isMain`

### Фильтрация каталога

**Доступные фильтры:**
- По размеру (10 фут, 20 фут, 40 фут)
- По состоянию (Новый, Б/У)
- Поиск по названию

**Как работает:**
1. Пользователь выбирает фильтр
2. React отправляет запрос на сервер с параметрами фильтра
3. Сервер возвращает отфильтрованный список
4. React обновляет список на странице

## Развертывание на своем сервере

### Вариант 1: На Linux сервере

```bash
# 1. Подключиться к серверу
ssh user@your-server.com

# 2. Установить Node.js (если нет)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Установить MySQL (если нет)
sudo apt-get install -y mysql-server

# 4. Клонировать репозиторий
git clone <URL_РЕПОЗИТОРИЯ> /var/www/contcatlog
cd /var/www/contcatlog

# 5. Установить зависимости
npm install -g pnpm
pnpm install

# 6. Создать .env файл с переменными окружения
nano .env
# Вставить содержимое из Шага 3 выше

# 7. Инициализировать БД
pnpm db:push

# 8. Собрать фронтенд
pnpm build

# 9. Запустить сервер (в фоне)
nohup pnpm start > server.log 2>&1 &

# 10. Проверить, что работает
curl http://localhost:3000
```

### Вариант 2: С использованием PM2 (рекомендуется)

```bash
# 1. Установить PM2
npm install -g pm2

# 2. Создать файл ecosystem.config.js в корне проекта:
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'contcatlog',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# 3. Запустить приложение
pm2 start ecosystem.config.js

# 4. Сохранить конфигурацию (чтобы приложение запускалось при перезагрузке)
pm2 save
pm2 startup

# 5. Проверить статус
pm2 status
pm2 logs contcatlog
```

### Вариант 3: С использованием Docker

```bash
# 1. Создать Dockerfile в корне проекта:
cat > Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
EOF

# 2. Создать .dockerignore
cat > .dockerignore << 'EOF'
node_modules
.git
.env.local
dist
EOF

# 3. Собрать образ
docker build -t contcatlog .

# 4. Запустить контейнер
docker run -d \
  --name contcatlog \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://user:pass@mysql-host:3306/contcatlog" \
  -e JWT_SECRET="your-secret-key" \
  contcatlog
```

## Настройка Nginx (обратный прокси)

Если хочешь, чтобы сайт был доступен по адресу `https://example.com` вместо `http://localhost:3000`:

```bash
# 1. Установить Nginx
sudo apt-get install -y nginx

# 2. Создать конфигурацию
sudo nano /etc/nginx/sites-available/contcatlog
```

Вставить:
```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 3. Включить конфигурацию
sudo ln -s /etc/nginx/sites-available/contcatlog /etc/nginx/sites-enabled/

# 4. Проверить синтаксис
sudo nginx -t

# 5. Перезагрузить Nginx
sudo systemctl restart nginx

# 6. Установить SSL сертификат (Let's Encrypt)
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com
```

## Команды для разработки

```bash
# Запустить в режиме разработки (с горячей перезагрузкой)
pnpm dev

# Запустить тесты
pnpm test

# Собрать для продакшена
pnpm build

# Запустить собранное приложение
pnpm start

# Обновить схему БД (после изменения schema.ts)
pnpm db:push

# Откатить последнюю миграцию
pnpm db:drop

# Открыть UI для управления БД
pnpm db:studio
```

## Решение проблем

### Проблема: "Cannot find module 'mysql2'"
**Решение:**
```bash
pnpm install
```

### Проблема: "ECONNREFUSED 127.0.0.1:3306"
**Решение:** База данных не запущена или неправильно настроена `DATABASE_URL`
```bash
# Проверить, что MySQL запущен
sudo systemctl status mysql

# Или проверить строку подключения в .env
# Должна быть: mysql://user:password@localhost:3306/database
```

### Проблема: "Port 3000 is already in use"
**Решение:** Изменить PORT в .env на другой (например, 3001)
```env
PORT=3001
```

### Проблема: "Cannot GET /admin"
**Решение:** Убедиться, что фронтенд собран
```bash
pnpm build
pnpm start
```

## Безопасность

**Важные моменты:**
1. **Не коммитить .env файл** - в .gitignore уже добавлено
2. **Менять JWT_SECRET** на свой (не использовать значение по умолчанию)
3. **Использовать HTTPS** на продакшене (Let's Encrypt)
4. **Регулярно обновлять зависимости:**
   ```bash
   pnpm update
   ```
5. **Делать резервные копии БД** регулярно

## Что дальше?

После успешного развертывания:

1. **Добавить контейнеры:**
   - Через админ-панель (импорт CSV)
   - Или вручную через форму

2. **Настроить домен:**
   - Купить домен
   - Настроить DNS на IP сервера
   - Установить SSL сертификат

3. **Добавить функционал:**
   - Фильтрацию по другим параметрам
   - Экспорт в PDF
   - Email уведомления
   - И т.д.

## Контакты и поддержка

Если что-то не работает:
1. Проверить логи: `pnpm dev` (в консоли будут ошибки)
2. Проверить переменные окружения в .env
3. Проверить, что MySQL запущена и доступна
4. Проверить, что порт 3000 свободен

---

**Версия документации:** 1.0  
**Дата:** 2025-12-26  
**Проект:** ContCatLog - Container Catalog Platform
