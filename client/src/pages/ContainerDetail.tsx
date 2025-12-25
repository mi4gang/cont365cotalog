import { useState, useRef, useEffect, TouchEvent } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import CatalogHeader from "@/components/CatalogHeader";
import { ChevronLeft, ChevronRight, ArrowLeft, Loader2, X } from "lucide-react";

export default function ContainerDetail() {
  const params = useParams<{ id: string }>();
  const containerId = parseInt(params.id || "0", 10);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Touch swipe support
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const { data: container, isLoading, error } = trpc.containers.getById.useQuery(
    { id: containerId },
    { enabled: containerId > 0 }
  );

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;
    
    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        // Swipe left - next photo
        nextPhoto();
      } else {
        // Swipe right - prev photo
        prevPhoto();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="detail-page">
        <CatalogHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </div>
    );
  }

  if (error || !container) {
    return (
      <div className="detail-page">
        <CatalogHeader />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Контейнер не найден</h1>
          <Link href="/catalog">
            <button className="back-button">
              <ArrowLeft className="w-4 h-4" />
              Вернуться в каталог
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const photos = container.photos || [];
  const currentPhoto = photos[currentPhotoIndex];

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const formatPrice = (price: string | null) => {
    if (!price) return "Цена по запросу";
    const num = parseFloat(price);
    const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return formatted + " ₽";
  };

  const whatsappMessage = encodeURIComponent(
    `Здравствуйте! Меня интересует ${container.name} (ID: ${container.externalId})`
  );
  const whatsappUrl = `https://wa.me/79999999999?text=${whatsappMessage}`;

  // Badge style - more contrasting for visibility on dark background
  const badgeStyle = container.condition === "new"
    ? { background: "rgba(59, 130, 246, 0.9)" } // Brighter blue
    : { background: "rgba(120, 130, 150, 0.95)" }; // Lighter gray for better contrast

  // Card gradient matching catalog cards
  const cardGradient = container.condition === "new" 
    ? "linear-gradient(to right bottom, oklab(0.279 -0.00709772 -0.040381 / 0.75) 0%, oklab(0.379 -0.0113991 -0.145554 / 0.65) 100%)"
    : "linear-gradient(to right bottom, oklab(0.372 -0.00968297 -0.0429213 / 0.75) 0%, oklab(0.279 -0.00709772 -0.040381 / 0.65) 100%)";

  return (
    <div className="detail-page">
      <CatalogHeader />

      {/* Main content area */}
      <main className="container py-4 sm:py-6">
        {/* Back Button */}
        <Link href="/catalog" className="inline-flex items-center gap-2 transition-colors mb-4 sm:mb-6" style={{ color: 'oklch(0.869 0.022 252.894)' }}>
          <ChevronLeft className="w-5 h-5" />
          <span>Назад в каталог</span>
        </Link>

        {/* Glassmorphism container - includes title and ID */}
        <div 
          className="rounded-2xl p-4 sm:p-6"
          style={{
            background: 'rgba(20, 30, 50, 0.6)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* Title and ID - INSIDE the glassmorphism block */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{container.name}</h1>
            <p className="text-slate-400 text-sm sm:text-base">ID: {container.externalId}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Photo Gallery - Left Column (wider) */}
            <div className="lg:col-span-2">
              {/* Main Photo - taller, clickable for fullscreen, swipeable */}
              <div 
                className="relative rounded-xl overflow-hidden mb-3 sm:mb-4 cursor-pointer" 
                style={{ 
                  height: 'clamp(300px, 50vh, 500px)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(8px)'
                }}
                onClick={() => photos.length > 0 && setIsFullscreen(true)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {currentPhoto ? (
                  <img
                    src={currentPhoto.url}
                    alt={`${container.name} - фото ${currentPhotoIndex + 1}`}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-20 h-20 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {/* Navigation Arrows - hidden on mobile (use swipe) */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                      className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white transition-colors border border-white/20"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                      className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white transition-colors border border-white/20"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Photo Counter */}
                {photos.length > 0 && (
                  <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-black/60 px-3 py-1.5 rounded-lg text-white text-sm font-medium">
                    {currentPhotoIndex + 1} / {photos.length}
                  </div>
                )}
              </div>

              {/* Thumbnails - non-transparent, scrollable on mobile */}
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden transition-all"
                      style={{
                        border: index === currentPhotoIndex 
                          ? '2px solid rgb(201, 122, 58)' 
                          : '2px solid rgba(100, 116, 139, 0.3)',
                        opacity: 1 // Non-transparent thumbnails
                      }}
                    >
                      <img
                        src={photo.url}
                        alt={`Миниатюра ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Specifications - Right Column (narrower) */}
            <div className="lg:col-span-1">
              <div 
                className="rounded-xl p-4 sm:p-5"
                style={{ 
                  background: cardGradient,
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(100, 116, 139, 0.2)'
                }}
              >
                {/* Title "Характеристики" */}
                <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-5">Характеристики</h2>

                {/* Specifications */}
                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-5">
                  <div>
                    <p className="text-slate-400 text-xs sm:text-sm mb-1">Тип контейнера</p>
                    <p className="text-white font-medium text-sm sm:text-base">{container.size}</p>
                  </div>

                  {/* Badge inside specifications block - more visible */}
                  <div>
                    <p className="text-slate-400 text-xs sm:text-sm mb-1">Состояние</p>
                    <span 
                      className="inline-block text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ 
                        ...badgeStyle,
                        color: "#fff"
                      }}
                    >
                      {container.condition === "new" ? "Новый" : "Б/У"}
                    </span>
                  </div>

                  <div>
                    <p className="text-slate-400 text-xs sm:text-sm mb-1">ID контейнера</p>
                    <p className="text-white font-medium text-sm sm:text-base">{container.externalId}</p>
                  </div>

                  {container.description && (
                    <div>
                      <p className="text-slate-400 text-xs sm:text-sm mb-1">Описание</p>
                      <p className="text-white text-xs sm:text-sm leading-relaxed">{container.description}</p>
                    </div>
                  )}
                </div>

                {/* Price Block - Darker background */}
                <div 
                  className="rounded-lg p-3 sm:p-4 mb-4 sm:mb-5"
                  style={{ background: 'rgba(15, 23, 42, 0.6)' }}
                >
                  <p className="text-slate-400 text-xs sm:text-sm mb-1">Цена</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    {formatPrice(container.price)}
                  </p>
                </div>

                {/* WhatsApp Button - No icon, same hover as "Смотреть" */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center py-3 px-4 rounded-lg font-semibold text-white transition-all catalog-button text-sm sm:text-base"
                >
                  Заказать через WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fullscreen Photo Viewer with swipe support */}
      {isFullscreen && photos.length > 0 && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.95)' }}
          onClick={() => setIsFullscreen(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close button */}
          <button 
            className="absolute top-4 right-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            onClick={() => setIsFullscreen(false)}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Main image */}
          <img
            src={currentPhoto?.url}
            alt={`${container.name} - фото ${currentPhotoIndex + 1}`}
            className="max-w-[95vw] max-h-[85vh] sm:max-w-[90vw] sm:max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* Navigation Arrows - hidden on mobile (use swipe) */}
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Photo Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-lg text-white text-sm font-medium">
            {currentPhotoIndex + 1} / {photos.length}
          </div>
          
          {/* Swipe hint for mobile */}
          <div className="sm:hidden absolute bottom-16 left-1/2 -translate-x-1/2 text-white/50 text-xs">
            Свайпните для переключения
          </div>
        </div>
      )}
    </div>
  );
}
