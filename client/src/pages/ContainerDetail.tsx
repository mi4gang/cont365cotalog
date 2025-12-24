import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import CatalogHeader from "@/components/CatalogHeader";
import { ChevronLeft, ChevronRight, ArrowLeft, Loader2, MessageCircle } from "lucide-react";

export default function ContainerDetail() {
  const params = useParams<{ id: string }>();
  const containerId = parseInt(params.id || "0", 10);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const { data: container, isLoading, error } = trpc.containers.getById.useQuery(
    { id: containerId },
    { enabled: containerId > 0 }
  );

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
    // Use space as thousands separator and dot for decimals (matching original)
    const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return formatted + " ₽";
  };

  const whatsappMessage = encodeURIComponent(
    `Здравствуйте! Меня интересует ${container.name} (ID: ${container.externalId})`
  );
  const whatsappUrl = `https://wa.me/79999999999?text=${whatsappMessage}`;

  return (
    <div className="detail-page">
      <CatalogHeader />

      <main className="container py-6">
        {/* Back Button - Yellow text like original */}
        <Link href="/catalog" className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors mb-6">
          <ChevronLeft className="w-5 h-5" />
          <span>Назад в каталог</span>
        </Link>

        {/* Title and ID - Above gallery like original */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">{container.name}</h1>
          <p className="text-slate-400">ID: {container.externalId}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Photo Gallery - Left Column */}
          <div className="lg:col-span-3">
            {/* Main Photo */}
            <div className="relative bg-black/30 rounded-xl overflow-hidden mb-4" style={{ height: '400px' }}>
              {currentPhoto ? (
                <img
                  src={currentPhoto.url}
                  alt={`${container.name} - фото ${currentPhotoIndex + 1}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-20 h-20 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Navigation Arrows */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors border border-white/20"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors border border-white/20"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Photo Counter */}
              {photos.length > 0 && (
                <div className="absolute bottom-4 right-4 bg-black/60 px-3 py-1.5 rounded-lg text-white text-sm font-medium">
                  {currentPhotoIndex + 1} / {photos.length}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all ${
                      index === currentPhotoIndex 
                        ? "ring-2 ring-orange-500 opacity-100" 
                        : "opacity-60 hover:opacity-100"
                    }`}
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

          {/* Specifications - Right Column */}
          <div className="lg:col-span-2">
            <div className="detail-info-card">
              {/* Title "Характеристики" like original */}
              <h2 className="text-2xl font-bold text-white mb-6">Характеристики</h2>

              {/* Specifications */}
              <div className="space-y-4 mb-6">
                <div>
                  <p className="detail-spec-label">Тип контейнера</p>
                  <p className="detail-spec-value">{container.size}</p>
                </div>

                <div>
                  <p className="detail-spec-label">Состояние</p>
                  <span className={`catalog-badge inline-block ${container.condition === "new" ? "catalog-badge-new" : ""}`}>
                    {container.condition === "new" ? "Новый" : "Б/У"}
                  </span>
                </div>

                <div>
                  <p className="detail-spec-label">ID контейнера</p>
                  <p className="detail-spec-value">{container.externalId}</p>
                </div>

                {container.description && (
                  <div>
                    <p className="detail-spec-label">Описание</p>
                    <p className="text-white text-sm leading-relaxed">{container.description}</p>
                  </div>
                )}
              </div>

              {/* Price Block - Dark background like original */}
              <div className="bg-slate-900/60 rounded-lg p-4 mb-6">
                <p className="text-slate-400 text-sm mb-1">Цена</p>
                <p className="text-2xl font-bold" style={{ color: 'rgb(255, 140, 50)' }}>
                  {formatPrice(container.price)}
                </p>
              </div>

              {/* WhatsApp Button - Solid green like original */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium bg-[#25d366] text-white hover:bg-[#20bd5a] transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Заказать через WhatsApp
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
