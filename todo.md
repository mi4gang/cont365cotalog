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
