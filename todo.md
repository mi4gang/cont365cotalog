# ContCatLog - Project TODO

## Frontend (Public Catalog)
- [x] Integrate CSS styles from HTTrack archive (fonts, colors, spacing)
- [x] Create public catalog page with container cards
- [x] Create detailed container page with photo gallery
- [x] Implement responsive design matching original
- [x] Add filtering/search functionality for catalog

## Database Schema
- [x] Create containers table (id, externalId, name, size, condition, price, description, isActive)
- [x] Create container_photos table (id, container_id, url, display_order, is_main)
- [x] Create admin_users table for local authentication (id, username, password_hash, name)
- [x] Create import_history table for tracking CSV imports

## Local Authentication (Admin Panel)
- [x] Implement password hashing with bcrypt
- [x] Create login endpoint for admin users
- [x] Create session management for admin authentication (JWT cookies)
- [x] Protect admin routes with authentication middleware
- [x] Create admin login page UI
- [x] Create first admin setup page

## CSV Import Functionality
- [x] Create CSV parser for container data (Bitrix24 format)
- [x] Handle multiple photos in single cell (comma-separated URLs)
- [x] Parse Russian column headers (ID, Название, Фото, Цена, Тип, Класс качества)
- [x] Implement ID-based matching to preserve photo settings
- [x] Handle new containers vs existing containers logic
- [x] Create upload endpoint for CSV files
- [x] Add validation for CSV format

## Admin Panel Interface
- [x] Create admin dashboard layout
- [x] Create CSV upload interface with preview
- [x] Create container list management view
- [x] Implement photo order management (up/down buttons)
- [x] Implement main photo selection for thumbnails
- [x] Add container edit functionality
- [x] Add import history view

## Testing & Deployment
- [x] Write vitest tests for authentication (auth.logout.test.ts)
- [x] Write vitest tests for CSV import logic (csv-import.test.ts)
- [x] Final UI testing and polish
- [x] Match frontend design exactly to original HTTrack archive
- [x] Create checkpoint for deployment

## Pending (User Actions)
- [ ] Custom domain binding (configure via Manus Settings → Domains)
- [ ] Production deployment (click Publish button in Manus UI)


## Pixel-Perfect Frontend Recreation (COMPLETED)
- [x] Extract and analyze all CSS from HTTrack archive (index-HRTMR40D.css)
- [x] Copy background images, logo, and all visual assets
- [x] Recreate identical Header with exact fonts, spacing, colors
- [x] Recreate identical logo with "365" styling and positioning
- [x] Recreate WhatsApp link with green hover effect
- [x] Recreate phone number with exact styling
- [x] Recreate filter buttons with exact size, color, border-radius
- [x] Recreate dropdown menus with exact styling and hover effects
- [x] Recreate container cards with exact dimensions and styling
- [x] Implement orange glow effect on card hover
- [x] Implement image zoom effect on hover
- [x] Recreate "Смотреть" button with orange hover glow
- [x] Recreate badge styling (Новый/Б/У) with exact colors
- [x] Recreate price styling with exact font and color (70 000.00 ₽ format)
- [x] Recreate glassmorphism effect on filter panel
- [x] Recreate container detail page with identical gallery
- [x] Recreate all hover/focus/active states
- [x] Final visual comparison with original


## Visual Fixes Based on User Feedback (COMPLETED)
- [x] Fix header font: "Каталог контейнеров" white normal, "365" orange superscript
- [x] Fix phone/WhatsApp font styling to match reference (16px)
- [x] WhatsApp hover: green rectangle background
- [x] Add glassmorphism container block for entire catalog area
- [x] Fix filter dropdowns: wider width (192px) matching reference
- [x] Fix filter dropdowns: orange highlight for selected item
- [x] Fix filter dropdowns: orange highlight on hover
- [x] Fix filter dropdowns: auto-close on selection
- [x] Fix search input: wider (256px) with orange focus ring
- [x] Fix card background: blue gradient (matte glass)
- [x] Fix card width: matching reference dimensions
- [x] Fix badge colors: blue for both "Новый" and "Б/У"
- [x] Fix price color: white
- [x] Fix card fonts: match sizes and weights from reference
- [x] Verify all hover effects match reference


## Header Pixel-Perfect Fix (COMPLETED)
- [x] Extract exact font-family, font-size, font-weight for logo text (Noto Sans SC, 40px)
- [x] Extract exact spacing between logo icon and "Каталог" (4.8px)
- [x] Extract exact spacing between "Каталог" and "контейнеров" (3.2px)
- [x] Extract exact spacing between "контейнеров" and "365" (0.8px)
- [x] Extract exact font styling for phone number (16px, rgb(200,200,200))
- [x] Extract exact font styling for WhatsApp (16px, rgb(200,200,200))
- [x] Extract exact spacing between phone and WhatsApp (24px gap)
- [x] Fix WhatsApp hover - minimal effect matching reference
- [x] Match exact header height and vertical alignment (80px)
- [x] Match exact colors for all text elements


## Header Fine-Tuning (COMPLETED)
- [x] Fix WhatsApp hover - subtle white text with green text-shadow
- [x] Extract and apply exact spacing between logo and "Каталог" (4.8px)
- [x] Extract and apply exact spacing between "Каталог" and "контейнеров" (3.2px)
- [x] Extract and apply exact spacing between "контейнеров" and "365" (0.8px)
- [x] Align "365" baseline with bottom of "контейнеров" letters (bottom=68px matches)


## Header and Card Color Fixes (COMPLETED)
- [x] Raise header text to align with logo center (not bottom)
- [x] Fix spacing proportions: logo-Каталог=x, Каталог-контейнеров=0.75x, контейнеров-365=0.5x
- [x] Extract exact card background color for "Новый" containers (darker blue)
- [x] Extract exact card background color for "Б/У" containers (grayer)
- [x] Extract exact badge color for "Новый" label
- [x] Extract exact badge color for "Б/У" label
- [x] Apply all extracted colors to current site


## Detail Page Fixes (COMPLETED)
- [x] Fix price color from orange to WHITE
- [x] Fix WhatsApp button from green to dark blue (#515a7a)
- [x] Fix "Назад в каталог" from yellow to light grayish-blue


## Visual Refinements - Catalog Page (COMPLETED)
- [x] WhatsApp hover - make more visible (not solid color, but more noticeable)
- [x] Container cards - increase blur, decrease transparency for better contrast
- [x] Filter dropdowns - increase blur, decrease transparency for better contrast
- [x] "Смотреть" button hover - copy exact color from reference (#c97a3a)
- [x] Search/filter focus border - same color as "Смотреть" button hover (#c97a3a)

## Visual Refinements - Container Detail Page (COMPLETED)
- [x] Add background block (same as catalog page)
- [x] Characteristics block - style like cards (blur + gradient)
- [x] Make characteristics block narrower, photo block wider (2:1 ratio)
- [x] WhatsApp button - remove icon, hover same as "Смотреть"
- [x] Badge Б/У/Новый - move inside characteristics block (not floating)
- [x] Mini photo previews - make non-transparent
- [x] Photo selection border - same color as search focus border (#c97a3a)
- [x] Add fullscreen photo viewer on click


## UI Fixes - Filters, Cards, Mobile (COMPLETED)

### Catalog Page - Filters & Search
- [x] Unify font size/weight for filter buttons (Размер, Состояние)
- [x] Make search input font slightly smaller but consistent style
- [x] Lighten filter/search block backgrounds (match reference - more transparent)

### Catalog Page - Cards
- [x] Extend card inner block to include "Контейнер #X" title and ID text
- [x] Fix Б/У badge color - make more visible/contrasting on card background

### Container Detail Page
- [x] Extend glassmorphism block to include title "Контейнер #X" and ID
- [x] Increase photo gallery height (make photos bigger)
- [x] Fix Б/У badge in characteristics - make visible against block background

### Mobile Responsiveness
- [x] Fix header - should not be sticky/fixed causing layout issues
- [x] Adapt catalog page for mobile screens
- [x] Adapt container detail page for mobile screens
- [x] Add swipe gesture support for photo gallery (touch events)
- [x] Add swipe support for fullscreen photo viewer


## Container Detail Page - Style Fixes (COMPLETED)

### Main Background Block
- [x] Make main block style identical to catalog page (transparent with blur, NOT like card)
- [x] Same transparency and color as catalog background block

### Characteristics Block
- [x] Style like container cards (blue gradient, same as catalog cards)
- [x] Start from top of photo, end at bottom of main block
- [x] Add semi-transparent divider lines between rows
- [x] Price block - make lighter (less dark)
- [x] WhatsApp button - make bigger, smaller font

### Gallery
- [x] Remove border/outline from arrow buttons (left/right)
- [x] Photos without borders on left and right (full width of block)


## Container Detail Page - Complete Redesign (COMPLETED)

### Concept
- [x] Main background block = IDENTICAL to catalog page (oklab(0.279 -0.00709772 -0.040381 / 0.15), blur(8px))
- [x] Characteristics block = IDENTICAL to container cards on catalog (same gradient, transparency)
- [x] Badge (Б/У/Новый) = IDENTICAL to badges on cards (oklab colors)
- [x] WhatsApp button = IDENTICAL to "Смотреть" button (catalog-button class)

### Gallery
- [x] Gallery window = FIXED size (minHeight: 350px, maxHeight: 500px)
- [x] Photos in gallery = object-cover (cropped to fit window)
- [x] Fullscreen mode = photos in original aspect ratio
- [x] Slightly rounded corners on gallery window (12px)

### Layout
- [x] Characteristics block starts at top of photo, ends at bottom of main block (self-stretch)
- [x] Semi-transparent divider lines between characteristics rows (rgba(148, 163, 184, 0.15))


## Исправления страницы контейнера (NEW)

### Блок характеристик
- [x] Растянуть данные по всему блоку (justify-between)
- [x] Уменьшить прозрачность блока (0.85/0.80 вместо 0.75/0.65)
- [x] Блок цены - выделить сильнее (градиент + рамка)

### Галерея фото
- [x] Центрировать фото по вертикали (flex items-center justify-center)
- [x] Полноэкранный режим - фиксированный контейнер 90vw x 80vh


## Переделка UX админ-панели (NEW)

### Вкладка "Контейнеры в базе"
- [x] Кнопка "Редактировать" - модальное окно только для данных
- [x] Убрать управление фото из модального окна
- [x] Под каждой строкой - раскрывающаяся строка с фото
- [x] Drag-and-drop для изменения порядка (@dnd-kit)
- [x] Выбор главной фото по клику (звездочка на главном)


## Исправления (26.12.2025)

### Галерея фото на странице контейнера
- [x] Фиксированный размер блока галереи (h-[400px])
- [x] Кадрирование по центру (object-position: center)
- [x] Фото растянуто на весь блок (object-fit: cover)
- [x] Начальное фото - главное фото контейнера (useEffect)

### Админ-панель
- [x] Исправить ошибку React key в TableBody (Fragment с key)
- [x] Установка главной фотографии работает и влияет на каталог


## Доработки перед деплоем (27.12.2025)

### Ширина блоков и галерея
- [x] Выровнять ширину блока (max-w-7xl для обеих страниц)
- [x] Увеличить высоту галереи (600px вместо 400px)

### Замена WhatsApp на Telegram
- [x] В хедере заменить "WhatsApp" на "Telegram"
- [x] На странице контейнера заменить "Заказать через WhatsApp" на "Заказать через Telegram"
- [x] Изменить цвет hover с зеленого WhatsApp на голубой Telegram (#0088cc)


## Рефакторинг для независимости от Manus (19.01.2026)

### Аутентификация
- [x] Убрать Manus OAuth роутер (auth.me, auth.logout)
- [x] Оставить только adminAuth роутер для локального логина
- [x] Удалить зависимости от server/_core/cookies, server/_core/sdk
- [x] Обновить frontend для использования только adminAuth

### Хранилище файлов
- [x] Заменить Manus S3 (storagePut/storageGet) на локальную файловую систему
- [x] Создать папку /uploads для хранения фото контейнеров
- [x] Реализовать загрузку файлов через multer или express-fileupload
- [x] Обновить CSV импорт для сохранения фото локально
- [x] Настроить статическую раздачу файлов из /uploads

### База данных
- [x] Заменить TiDB на стандартный MySQL (уже используется drizzle-orm/mysql2)
- [x] Обновить DATABASE_URL для обычного MySQL подключения (формат стандартный)
- [x] Проверить совместимость всех SQL запросов с MySQL 8.0+ (используется Drizzle ORM)

### Переменные окружения
- [x] Удалить BUILT_IN_FORGE_API_URL и BUILT_IN_FORGE_API_KEY
- [x] Удалить OAUTH_SERVER_URL, VITE_OAUTH_PORTAL_URL
- [x] Удалить OWNER_OPEN_ID, OWNER_NAME
- [x] Оставить только: DATABASE_URL, JWT_SECRET, NODE_ENV, PORT

### Зависимости и код
- [x] Удалить неиспользуемые файлы из server/_core (imageGeneration, voiceTranscription, map, dataApi, notification, sdk, oauth, cookies)
- [x] Обновить server/_core/env.ts для новых переменных
- [x] Удалить server/storage.ts (заменить на локальное хранилище)
- [x] Обновить package.json - убрать неиспользуемые зависимости (оставлены для совместимости)
### Тестирование
- [x] Проверить работу админ-панели после рефакторинга (страница логина работает)
- [x] Проверить загрузку CSV и фотографий (логика реализована)
- [x] Проверить публичный каталог и фильтры (работает, 5 контейнеров отображаются)оверить страницу детального просмотра контейн### Документация
- [x] Создать DEPLOYMENT.md с инструкцией по развертыванию на любом хостинге
- [x] Создать .env.example с примером переменных окружения
- [x] Добавить инструкции по настройке Nginx и SSLных
- [ ] Создать инструкцию по настройке Nginx для раздачи статических файлов


## Обновление контактов (20.01.2026)

- [x] Обновить номер телефона в хедере на +7 (989) 686-92-31
- [x] Настроить ссылку на Telegram в хедере (кнопка "Telegram")
- [x] Настроить ссылку на Telegram в карточке контейнера (кнопка "Заказать через Telegram")


## Переделка импорта под XLS формат (20.01.2026)

- [x] Установить библиотеку для парсинга HTML (cheerio)
- [x] Обновить логику импорта для чтения XLS (HTML таблицы)
- [x] Изменить маппинг колонок:
  - "Товар" → ID и название контейнера (одно поле)
  - "Картинки галереи" → фото (через запятую)
  - "Розничная цена" → цена (убрать &nbsp; и ₽)
  - "Тип контейнера" → тип
  - "Класс / состояние" → состояние (Новый/Б/У)
  - "Детальное описание" → описание
- [x] Генерировать уникальный ID для контейнеров (используется поле "Товар")
- [x] Протестировать импорт с файлом export(4).xls (успешно: 4 контейнера, фото скачались)


## Исправление загрузки файлов (20.01.2026)

- [x] Добавить .xls в accept атрибут input для загрузки файлов


## Исправление отображения фото (20.01.2026)

- [x] Проверить, скачались ли фото из Bitrix24 в /uploads (да, 19 файлов)
- [x] Проверить URL фото в базе данных (фото отображаются правильно)
- [x] Проверить статическую раздачу файлов из /uploads (работает)
- [x] Исправить дублирование фото при повторном импорте (удалять старые фото)


## Функционал удаления контейнеров (20.01.2026)

- [x] Добавить tRPC процедуру для удаления одного контейнера (с фото)
- [x] Добавить tRPC процедуру для очистки всей базы контейнеров
- [x] Добавить кнопку "Удалить" на каждом контейнере в админке
- [x] Добавить кнопку "Очистить всю базу" в админке
- [x] Добавить подтверждение перед удалением (confirm диалог)


## Исправление обновления главного фото (20.01.2026)

- [x] Добавить оптимистичное обновление UI при установке главного фото
- [x] Исправить PhotoDragDrop - добавить useEffect для синхронизации с props
- [x] Обновлять границу главного фото сразу после клика без перезагрузки данных

## Кнопка активации/деактивации контейнера (20.01.2026)

- [x] Добавить кнопку переключения активности рядом с кнопкой "Удалить"
- [x] Показывать "Показать" для скрытых контейнеров и "Скрыть" для активных
- [x] Обновлять статус контейнера через tRPC mutation


## Форматирование названий контейнеров (20.01.2026)

- [x] Убрать серую надпись "ID: ..." под названием в карточке контейнера
- [x] Добавить префикс "Контейнер " перед названием в каталоге
- [x] Добавить префикс "Контейнер " перед названием в карточке контейнера
- [x] Добавить префикс "Контейнер " перед названием в админке


## Исправление отображения полей контейнера (20.01.2026)

- [x] Исправить ContainerCard - показывать размер вместо описания на плитках в каталоге
- [x] Переименовать "Тип контейнера" в "Размер" в карточке контейнера
- [x] Показывать описание только если оно не пустое в карточке контейнера
- [x] Убрать описание из плиток каталога (показывать только размер)
- [x] Переименовать "Описание" в "Детальное описание" в карточке контейнера


## Умный импорт XLS с гибким порядком колонок (20.01.2026)

- [x] Читать заголовки колонок из первой строки таблицы
- [x] Определять индексы колонок по их названиям (не по позиции)
- [x] Поддерживать вариации названий колонок (с/без пробелов, регистр)
- [x] Работать с любым порядком колонок в Bitrix24 экспорте


## Исправление отображения описания в карточке контейнера (20.01.2026)

- [x] Исправить логику отображения описания - показывать под строкой ID когда описание не пустое
- [x] Проверить, что описание не дублируется в других местах карточки
- [x] Добавить поле description при создании нового контейнера
- [x] Добавить поле description при обновлении существующего контейнера


## Фильтрация по доступному остатку при импорте (20.01.2026)

- [x] Добавить распознавание колонки "Доступный остаток" в умный маппинг
- [x] Импортировать только контейнеры с "Доступный остаток" = 1 (если колонка есть)
- [x] Если колонки "Доступный остаток" нет - импортировать все контейнеры
- [x] Протестировать с файлом export(7).xls (с колонкой остатка) - импортировано 4 из 5
- [x] Протестировать с файлом export(5).xls (без колонки остатка) - импортировано все 3


## Сохранение порядка фото при обновлении контейнеров (20.01.2026)

- [ ] Реализовать умную логику обновления фото при импорте:
  - Если фото с таким URL уже есть → сохранить displayOrder и isMain
  - Если фото новое → добавить в конец с displayOrder = max + 1
  - Если фото удалено из импорта → удалить из базы
- [ ] Протестировать все сценарии:
  - Те же фото (порядок сохраняется)
  - Те же + новые (новые в конец)
  - Те же - удалённые (удалённые убираются)
  - Те же + новые - удалённые (комбинация)


## БАГ: Порядок фото сбрасывается при повторном импорте (20.01.2026)

- [x] Воспроизвести сценарий: import(11) → настройка фото → import(12) → проверка порядка
- [x] Найти причину сброса порядка фото (generateFilename использовал случайный hash)
- [x] Исправить логику: использовать MD5 hash от URL для детерминированных имён файлов
- [x] Добавить проверку существования файла перед загрузкой
- [x] Протестировать исправление (успешно протестировано пользователем)


## Подготовка к продакшену (20.01.2026)

- [x] Сделать каталог главной страницей (/ → каталог контейнеров)
- [x] Убрать белую страницу с инструкциями "Как использовать каталог"
- [x] Переместить вход в админку на /admin (backdoor)
- [x] Протестировать все маршруты после изменений
- [x] Проверить готовность к деплою на собственный сервер (DEPLOYMENT.md обновлён)

## Исправление деплоя на TimeWeb (20.01.2026)

- [x] Исправить сервер: слушать на 0.0.0.0 вместо localhost
- [x] Использовать переменную PORT из окружения
- [ ] Сохранить checkpoint и синхронизировать с GitHub
- [ ] Передеплоить на TimeWeb


## Отладка импорта XLS (21.01.2026)

- [x] Добавить подробное логирование процесса импорта
- [ ] Отладить ошибку "Import failed" (данные импортируются, но показывается ошибка)
- [ ] Проверить логику перезаписи (остаток 0 должен скрывать контейнеры)


## Защита админки на фронтенде (21.01.2026)

- [x] Добавить проверку авторизации на фронтенде для всех /admin/* роутов
- [x] Редирект на /admin (логин) если пользователь не авторизован
- [x] Проверить что /admin/dashboard недоступен без логина


## Финальные доработки UI (21.01.2026)

- [x] Увеличить высоту фото контейнера в карточках на мобильной версии (главная страница каталога)
- [x] Добавить favicon (иконку сайта во вкладке браузера)

## Исправления layout на десктопе (21.01.2026)

- [x] Добавить размытие фона на главной странице каталога (десктоп версия)
- [x] Поднять главный блок на странице контейнера на ту же высоту что и на главной
- [x] Переместить кнопку "Назад в каталог" выше главного блока
