import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import CatalogHeader from "@/components/CatalogHeader";
import { Button } from "@/components/ui/button";
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
      <div className="catalog-theme">
        <CatalogHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (error || !container) {
    return (
      <div className="catalog-theme">
        <CatalogHeader />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Контейнер не найден</h1>
          <Link href="/catalog">
            <Button variant="outline" className="text-white border-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Вернуться в каталог
            </Button>
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
    return new Intl.NumberFormat("ru-RU", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num) + " ₽";
  };

  const whatsappMessage = encodeURIComponent(
    `Здравствуйте! Меня интересует ${container.name} (ID: ${container.externalId})`
  );
  const whatsappUrl = `https://wa.me/79999999999?text=${whatsappMessage}`;

  return (
    <div className="catalog-theme">
      <CatalogHeader />

      <main className="container py-6">
        {/* Back Button */}
        <Link href="/catalog">
          <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад в каталог
          </Button>
        </Link>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-1">{container.name}</h1>
        <p className="text-[var(--catalog-muted)] mb-6">ID: {container.externalId}</p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Photo Gallery - Left Column */}
          <div className="lg:col-span-3">
            {/* Main Photo */}
            <div className="relative aspect-[4/3] bg-[var(--catalog-card)] rounded-lg overflow-hidden mb-4">
              {currentPhoto ? (
                <img
                  src={currentPhoto.url}
                  alt={`${container.name} - фото ${currentPhotoIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-20 h-20 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Navigation Arrows */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Photo Counter */}
              {photos.length > 0 && (
                <div className="absolute bottom-3 right-3 bg-black/60 px-3 py-1 rounded text-white text-sm">
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
                    className={`flex-shrink-0 w-20 h-20 rounded overflow-hidden transition-all ${
                      index === currentPhotoIndex
                        ? "ring-2 ring-[var(--catalog-price)]"
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
            <div className="catalog-card p-6">
              <h2 className="text-xl font-bold text-white mb-6">Характеристики</h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[var(--catalog-muted)]">Тип контейнера</p>
                  <p className="text-lg text-white font-medium">{container.size}</p>
                </div>

                <div>
                  <p className="text-sm text-[var(--catalog-muted)]">Состояние</p>
                  <span className={container.condition === "new" ? "badge-new" : "badge-used"}>
                    {container.condition === "new" ? "Новый" : "Б/У"}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-[var(--catalog-muted)]">ID контейнера</p>
                  <p className="text-lg text-white font-medium">{container.externalId}</p>
                </div>

                {container.description && (
                  <div>
                    <p className="text-sm text-[var(--catalog-muted)]">Описание</p>
                    <p className="text-white">{container.description}</p>
                  </div>
                )}
              </div>

              {/* Price Card */}
              <div className="mt-6 p-4 bg-black/30 rounded-lg">
                <p className="text-sm text-[var(--catalog-muted)]">Цена</p>
                <p className="text-2xl font-bold price-text">{formatPrice(container.price)}</p>
              </div>

              {/* WhatsApp Button */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 w-full whatsapp-btn flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium"
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
