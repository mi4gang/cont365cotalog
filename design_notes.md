# Design Notes from Original Site

## Home Page Design
- **Background:** Light gray/white (#f5f5f5 or similar)
- **Header:** Simple, clean with title "Каталог контейнеров" and subtitle "Морские контейнеры для перевозки грузов"
- **Login button:** Blue button "Вход" in top right corner
- **Main card:** White card with shadow, contains:
  - Blue icon (container/box icon)
  - Title "Каталог контейнеров"
  - Subtitle "Просмотрите доступные контейнеры"
  - Description text
  - Blue CTA button "Перейти в каталог"
- **Instructions card:** White card with numbered list "Как использовать каталог"
  - Numbers highlighted in yellow/gold color
  - Bold text for key terms
- **Footer:** "Made with Manus" badge

## Color Palette
- Primary Blue: #2563eb (buttons, links)
- Yellow/Gold: For numbered list markers
- White: Card backgrounds
- Light Gray: Page background
- Dark text: #1f2937 or similar

## Typography
- Font: Noto Sans SC (Google Fonts)
- Clean, modern sans-serif
- Headers: Bold weight
- Body: Regular weight

## Layout
- Centered content with max-width container
- Cards with rounded corners and subtle shadows
- Good spacing between elements


## Catalog Page Design

### Header
- Logo: Blue container icon with text "Каталог контейнеров 365"
- Contact info in top right: Phone "+7 (999) 999-99-99" and "WhatsApp" link
- Dark background (dark blue/navy)

### Filters Section
- Two dropdown filters: "Размер" (Size) and "Состояние" (Condition)
- Counter "Найдено: X" showing number of results
- Search input with placeholder "Поиск..."
- Dark background matching header

### Container Cards
- Grid layout (3 columns on desktop)
- Card structure:
  - Main photo at top (large, takes ~60% of card height)
  - Status badge in top-right corner of photo ("Б/У" gray, "Новый" green)
  - Photo filename badge (e.g., "2.jpg") on some photos
  - Title: "Контейнер #XX" in white/light text
  - Two columns below title:
    - Left: "Размер" label + value (e.g., "10 фут", "40 фут 2.6")
    - Right: "ID" label + value (e.g., "FONU11320953")
  - Price in yellow/gold color (e.g., "70 000.00 ₽")
  - Blue "Смотреть" button at bottom

### Color Palette (Catalog)
- Background: Dark navy blue (#1a1f36 or similar)
- Card background: Slightly lighter navy
- Text: White/light gray
- Price: Yellow/gold (#fbbf24 or similar)
- "Новый" badge: Green (#22c55e)
- "Б/У" badge: Gray (#6b7280)
- Buttons: Blue (#2563eb)
- Accent: Yellow "365" in logo

### Typography
- Font: Noto Sans SC
- Card titles: Bold, larger size
- Labels: Smaller, gray text
- Values: Regular weight, white


## Container Detail Page Design

### Layout
- Two-column layout on desktop
- Left: Photo gallery (larger area ~60%)
- Right: Specifications panel (~40%)

### Header
- Same as catalog page
- "Назад в каталог" back button with arrow

### Photo Gallery (Left Column)
- Main large photo with navigation arrows (< >) on sides
- Photo counter badge "1 / 6" in bottom-right of main photo
- Thumbnail strip below main photo (6 thumbnails visible)
- Selected thumbnail has yellow/gold border
- Thumbnails are clickable to change main photo

### Specifications Panel (Right Column)
- Title: "Характеристики" (bold, white)
- Spec items:
  - "Тип контейнера" label (gray) + value "10 фут" (white, bold)
  - "Состояние" label + badge "Б/У" (dark badge with white text)
  - "ID контейнера" label + value "FONU11320953"
- Price section:
  - Dark card/box with "Цена" label
  - Large price "70 000.00 ₽" in white
- Green CTA button "Заказать через WhatsApp" with green border

### Key UI Elements
- Back button: Text link with left arrow
- Photo navigation: Circular buttons with arrows
- Thumbnail selection: Yellow/gold border on active
- Status badge: Dark rounded badge
- Price card: Dark background, prominent display
- WhatsApp button: Green outline style

### Container Data Fields (from CSV)
- ID (unique identifier like FONU11320953)
- Name/Number (Контейнер #19)
- Size/Type (10 фут, 20 фут, 40 фут 2.6)
- Condition (Новый, Б/У)
- Price (70 000.00 ₽)
- Photos (multiple URLs, need order management)
