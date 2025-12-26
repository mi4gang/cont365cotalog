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
