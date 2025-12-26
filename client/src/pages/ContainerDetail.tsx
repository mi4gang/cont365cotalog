import { useState, useRef, TouchEvent } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import CatalogHeader from "@/components/CatalogHeader";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";

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
        nextPhoto();
      } else {
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
              <ChevronLeft className="w-4 h-4" />
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

  // Badge style - matching reference
  const badgeStyle = container.condition === "new"
    ? { background: "rgba(59, 130, 246, 0.9)" }
    : { background: "rgba(120, 130, 150, 0.95)" };

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

        {/* Main glassmorphism block - SAME STYLE AS CATALOG PAGE */}
        <div 
          className="rounded-2xl p-4 sm:p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.45) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(148, 163, 184, 0.15)'
          }}
        >
          {/* Title and ID */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{container.name}</h1>
            <p className="text-slate-400 text-sm sm:text-base">ID: {container.externalId}</p>
          </div>

          {/* Content grid - Photo gallery and Characteristics side by side, characteristics stretches full height */}
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-4 sm:gap-6">
            {/* Photo Gallery - Left Column (wider, no borders) */}
            <div className="flex-1 lg:flex-[2]">
              {/* Main Photo - full width, no side borders */}
              <div 
                className="relative rounded-xl overflow-hidden mb-3 sm:mb-4 cursor-pointer" 
                style={{ 
                  height: 'clamp(300px, 55vh, 550px)'
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
                  <div className="w-full h-full flex items-center justify-center bg-slate-800/30">
                    <svg className="w-20 h-20 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {/* Navigation Arrows - NO BORDER, just semi-transparent bg */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                      className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center text-white transition-colors"
                      style={{ background: 'rgba(20, 30, 50, 0.6)' }}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                      className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center text-white transition-colors"
                      style={{ background: 'rgba(20, 30, 50, 0.6)' }}
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

              {/* Thumbnails - non-transparent */}
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
                        opacity: 1
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

            {/* Characteristics - Right Column (same style as catalog cards, stretches to match photo+thumbnails height) */}
            <div className="lg:w-[320px] xl:w-[360px] flex-shrink-0 flex">
              <div 
                className="rounded-xl p-5 sm:p-6 h-full flex flex-col"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(59, 71, 99, 0.75) 0%, rgba(36, 46, 71, 0.65) 100%)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(100, 116, 139, 0.2)'
                }}
              >
                {/* Title */}
                <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-5">Характеристики</h2>

                {/* Specifications with dividers */}
                <div className="flex-1">
                  {/* Type */}
                  <div className="pb-3 mb-3" style={{ borderBottom: '1px solid rgba(94, 105, 130, 0.2)' }}>
                    <p className="text-slate-400 text-xs sm:text-sm mb-1">Тип контейнера</p>
                    <p className="text-white font-medium text-sm sm:text-base">{container.size}</p>
                  </div>

                  {/* Condition with Badge */}
                  <div className="pb-3 mb-3" style={{ borderBottom: '1px solid rgba(94, 105, 130, 0.2)' }}>
                    <p className="text-slate-400 text-xs sm:text-sm mb-1">Состояние</p>
                    <span 
                      className="inline-block text-xs font-semibold px-3 py-1 rounded"
                      style={{ 
                        ...badgeStyle,
                        color: "#fff"
                      }}
                    >
                      {container.condition === "new" ? "Новый" : "Б/У"}
                    </span>
                  </div>

                  {/* Container ID */}
                  <div className="pb-3 mb-3" style={{ borderBottom: '1px solid rgba(94, 105, 130, 0.2)' }}>
                    <p className="text-slate-400 text-xs sm:text-sm mb-1">ID контейнера</p>
                    <p className="text-white font-medium text-sm sm:text-base">{container.externalId}</p>
                  </div>

                  {/* Description if exists */}
                  {container.description && (
                    <div className="pb-3 mb-3" style={{ borderBottom: '1px solid rgba(94, 105, 130, 0.2)' }}>
                      <p className="text-slate-400 text-xs sm:text-sm mb-1">Описание</p>
                      <p className="text-white text-xs sm:text-sm leading-relaxed">{container.description}</p>
                    </div>
                  )}
                </div>

                {/* Price Block - with top divider, lighter background */}
                <div 
                  className="rounded-lg p-3 sm:p-4 mb-4"
                  style={{ 
                    background: 'rgba(30, 40, 60, 0.5)',
                    borderTop: '1px solid rgba(120, 130, 155, 0.3)'
                  }}
                >
                  <p className="text-slate-400 text-xs sm:text-sm mb-1">Цена</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    {formatPrice(container.price)}
                  </p>
                </div>

                {/* WhatsApp Button - Full width, proper size */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center rounded-xl font-medium text-white transition-all text-sm sm:text-base"
                  style={{
                    background: '#515a7a',
                    height: '48px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#c97a3a'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#515a7a'}
                >
                  Заказать через WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fullscreen Photo Viewer */}
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

          {/* Navigation Arrows - NO BORDER */}
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full items-center justify-center text-white transition-colors"
                style={{ background: 'rgba(20, 30, 50, 0.6)' }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full items-center justify-center text-white transition-colors"
                style={{ background: 'rgba(20, 30, 50, 0.6)' }}
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
