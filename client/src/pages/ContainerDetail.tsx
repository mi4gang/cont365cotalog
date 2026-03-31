import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import CatalogHeader from "@/components/CatalogHeader";
import { ChevronLeft, ChevronRight, Loader2, X, CalendarClock, Phone } from "lucide-react";

function formatPrice(price: string | null) {
  if (!price) return "Цена по запросу";
  const num = parseFloat(price);
  const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return formatted + " ₽";
}

function formatDate(value?: string | null) {
  if (!value) return "Не указан";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Не указан";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function ContainerDetail() {
  const params = useParams<{ id?: string; externalId?: string; dealId?: string }>();
  const containerId = parseInt(params.id || "0", 10);
  const reservedExternalId = params.externalId || "";
  const dealId = params.dealId ? parseInt(params.dealId, 10) : null;
  const isReservedMode = Number.isInteger(dealId) && Number(dealId) > 0;

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [initialIndexSet, setInitialIndexSet] = useState(false);

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const publicContainerQuery = trpc.containers.getPublicById.useQuery(
    { id: containerId },
    { enabled: containerId > 0 && !isReservedMode },
  );

  const reservedContainerQuery = trpc.reservations.getContainerByDealId.useQuery(
    { dealId: dealId ?? 0, externalId: reservedExternalId },
    { enabled: reservedExternalId.length > 0 && isReservedMode },
  );

  const publicContainer = publicContainerQuery.data;
  const reservedContainer = reservedContainerQuery.data;
  const container = isReservedMode ? reservedContainer : publicContainer;
  const reservation = reservedContainer?.reservation ?? null;
  const isLoading = isReservedMode ? reservedContainerQuery.isLoading : publicContainerQuery.isLoading;
  const error = isReservedMode ? reservedContainerQuery.error : publicContainerQuery.error;

  useEffect(() => {
    if (container?.photos && !initialIndexSet) {
      const mainPhotoIndex = container.photos.findIndex((p) => p.isMain);
      if (mainPhotoIndex >= 0) {
        setCurrentPhotoIndex(mainPhotoIndex);
      }
      setInitialIndexSet(true);
    }
  }, [container?.photos, initialIndexSet]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
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

  const backHref = isReservedMode ? `/reserve/deal/${dealId}` : "/";
  const backLabel = isReservedMode ? "Вернуться к брони" : "Назад в каталог";
  const serialSalesNote =
    "На фото показан пример контейнера этой модели. В наличии несколько одинаковых контейнеров. Перед отгрузкой отправим номер и видео именно того контейнера, который поедет к вам.";

  const telegramUrl = useMemo(() => {
    if (!container) return "https://t.me/+79686922531";

    const reservationText = isReservedMode && reservation
      ? [
          `Здравствуйте! Хочу обсудить бронь контейнера ${container.name}.`,
          `Сделка #${reservation.dealId}`,
          `Контейнер: ${container.name}`,
        ].join("\n")
      : container.serial
        ? `Здравствуйте! Меня интересует ${container.name}.`
        : `Здравствуйте! Меня интересует ${container.name} (ID: ${container.externalId})`;

    return `https://t.me/+79686922531?text=${encodeURIComponent(reservationText)}`;
  }, [container, isReservedMode]);

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
          <h1 className="text-2xl font-bold text-white mb-4">
            {isReservedMode ? "Контейнер в этой брони не найден" : "Контейнер не найден"}
          </h1>
          <Link href={backHref}>
            <button className="back-button">
              <ChevronLeft className="w-4 h-4" />
              {backLabel}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const photos = useMemo(() => {
    const seen = new Set<string>();
    return (container.photos || []).filter((photo) => {
      const url = String(photo.url || "").trim();
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }, [container.photos]);
  const currentPhoto = photos[currentPhotoIndex];

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const badgeStyle = container.condition === "new"
    ? { background: "oklab(0.511 0.0317755 -0.260066 / 0.9)" }
    : { background: "oklab(0.372 -0.00968297 -0.0429213 / 0.8)" };

  const cardGradient = container.condition === "new"
    ? "linear-gradient(to right bottom, oklab(0.279 -0.00709772 -0.040381 / 0.85) 0%, oklab(0.379 -0.0113991 -0.145554 / 0.80) 100%)"
    : "linear-gradient(to right bottom, oklab(0.372 -0.00968297 -0.0429213 / 0.85) 0%, oklab(0.279 -0.00709772 -0.040381 / 0.80) 100%)";

  return (
    <div className="detail-page">
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1,
          overflow: "hidden",
        }}
      >
        <img
          src="/container-terminal-bg.jpg"
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
            opacity: 0.5,
          }}
        />
      </div>
      <CatalogHeader />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div
          className="rounded-xl p-4 sm:p-8 shadow-lg"
          style={{
            background: "oklab(0.279 -0.00709772 -0.040381 / 0.15)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(148, 163, 184, 0.1)",
          }}
        >
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 mb-4 sm:mb-6 transition-all hover:gap-3 active:scale-95"
            style={{
              color: "oklch(0.869 0.022 252.894)",
              padding: "12px 16px",
              margin: "-12px -16px 0 -16px",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-base font-medium">{backLabel}</span>
          </Link>

          {isReservedMode && reservation ? (
            <section
              className="rounded-2xl border p-4 sm:p-5 mb-5 sm:mb-6"
              style={{
                background: "linear-gradient(135deg, rgba(17, 24, 39, 0.7) 0%, rgba(30, 41, 59, 0.55) 100%)",
                borderColor: "rgba(148, 163, 184, 0.16)",
              }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-300/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-100 mb-3">
                    Бронь по сделке #{reservation.dealId}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Контейнер {container.name}</h1>
                  <p className="text-slate-300">
                    Забронирован до {formatDate(reservation.reserveEnd)}.
                    {typeof reservation.reserveDays === "number"
                      ? ` Срок брони: ${reservation.reserveDays} дн.`
                      : ""}
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 min-w-0 lg:min-w-[360px]">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-1">Телефон клиента</div>
                    <div className="text-white font-semibold">{reservation.contactPhone || "Не указан"}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-1">Менеджер</div>
                    <div className="text-white font-semibold">{reservation.managerName || "Не указан"}</div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <div className="mb-4 sm:mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Контейнер {container.name}</h1>
              {container.serial ? (
                <div className="mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: "rgba(249, 115, 22, 0.92)" }}>
                  Как на фото
                </div>
              ) : null}
            </div>
          )}

          <div className="flex flex-col lg:flex-row lg:items-stretch gap-4 sm:gap-6">
            <div className="flex-1 lg:flex-[2] flex flex-col">
              <div
                className="relative overflow-hidden mb-3 sm:mb-4 cursor-pointer"
                style={{
                  minHeight: "600px",
                  maxHeight: "600px",
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
                    className="w-full h-full object-cover"
                    style={{ objectPosition: "center center" }}
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800/30">
                    <svg className="w-20 h-20 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {photos.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevPhoto();
                      }}
                      className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center text-white transition-colors hover:bg-white/20"
                      style={{ background: "rgba(20, 30, 50, 0.6)" }}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextPhoto();
                      }}
                      className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center text-white transition-colors hover:bg-white/20"
                      style={{ background: "rgba(20, 30, 50, 0.6)" }}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {photos.length > 0 && (
                  <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-black/60 px-3 py-1.5 rounded-lg text-white text-sm font-medium">
                    {currentPhotoIndex + 1} / {photos.length}
                  </div>
                )}
              </div>

              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden transition-all"
                      style={{
                        border: index === currentPhotoIndex
                          ? "2px solid rgb(201, 122, 58)"
                          : "2px solid rgba(100, 116, 139, 0.3)",
                        opacity: 1,
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

            <div className="lg:w-[320px] xl:w-[360px] flex-shrink-0">
              <div
                className="rounded-xl p-5 sm:p-6 w-full h-full flex flex-col"
                style={{
                  background: cardGradient,
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                }}
              >
                <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-5">Характеристики</h2>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {container.serial ? (
                      <div
                        className="rounded-lg p-4 mb-4"
                        style={{
                          background: "linear-gradient(135deg, rgba(249, 115, 22, 0.18) 0%, rgba(251, 146, 60, 0.12) 100%)",
                          border: "1px solid rgba(251, 146, 60, 0.35)",
                        }}
                      >
                        <p className="text-orange-200 text-xs sm:text-sm font-semibold mb-1">О поставке</p>
                        <p className="text-white text-xs sm:text-sm leading-relaxed">
                          {container.description || serialSalesNote}
                        </p>
                      </div>
                    ) : null}

                    <div className="pb-3 mb-3" style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.15)" }}>
                      <p className="text-slate-400 text-xs sm:text-sm mb-1">Размер</p>
                      <p className="text-white font-medium text-sm sm:text-base">{container.size}</p>
                    </div>

                    <div className="pb-3 mb-3" style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.15)" }}>
                      <p className="text-slate-400 text-xs sm:text-sm mb-1">Состояние</p>
                      <span
                        className="inline-block text-xs font-semibold px-3 py-1 rounded-full"
                        style={{
                          ...badgeStyle,
                          color: "#fff",
                        }}
                      >
                        {container.condition === "new" ? "Новый" : "Б/У"}
                      </span>
                    </div>

                    {!container.serial ? (
                      <div className="pb-3 mb-3" style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.15)" }}>
                        <p className="text-slate-400 text-xs sm:text-sm mb-1">ID контейнера</p>
                        <p className="text-white font-medium text-sm sm:text-base">{container.externalId}</p>
                      </div>
                    ) : (
                      <div className="pb-3 mb-3" style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.15)" }}>
                        <p className="text-slate-400 text-xs sm:text-sm mb-1">Поставка</p>
                        <p className="text-white font-medium text-sm sm:text-base">
                          Перед отгрузкой отправим номер и видео контейнера
                        </p>
                      </div>
                    )}

                    {container.terminalLocation && (
                      <div className="pb-3 mb-3" style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.15)" }}>
                        <p className="text-slate-400 text-xs sm:text-sm mb-1">Локация терминал</p>
                        <p className="text-white font-medium text-sm sm:text-base">{container.terminalLocation}</p>
                      </div>
                    )}

                    {isReservedMode && reservation ? (
                      <div className="pb-3 mb-3" style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.15)" }}>
                        <p className="text-slate-400 text-xs sm:text-sm mb-1">Срок брони</p>
                        <div className="text-white font-medium text-sm sm:text-base flex items-center gap-2">
                          <CalendarClock className="w-4 h-4" />
                          До {formatDate(reservation.reserveEnd)}
                        </div>
                        <div className="text-slate-300 text-xs sm:text-sm mt-2">
                          {typeof reservation.reserveDays === "number"
                            ? `Длительность брони: ${reservation.reserveDays} дн.`
                            : "Длительность брони не указана"}
                        </div>
                      </div>
                    ) : null}

                    {container.description && !container.serial && (
                      <div className="pb-3 mb-3" style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.15)" }}>
                        <p className="text-slate-400 text-xs sm:text-sm mb-1">Детальное описание</p>
                        <p className="text-white text-xs sm:text-sm leading-relaxed">{container.description}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <div
                      className="rounded-lg p-4 sm:p-5 mb-4"
                      style={{
                        background: "linear-gradient(135deg, rgba(51, 65, 85, 0.7) 0%, rgba(30, 41, 59, 0.6) 100%)",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                      }}
                    >
                      <p className="text-slate-300 text-xs sm:text-sm mb-1">Цена продажи</p>
                      <p className="text-2xl sm:text-3xl font-bold text-white">
                        {formatPrice(container.price)}
                      </p>
                    </div>

                    {isReservedMode && reservation ? (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-4 mb-4">
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-2">Данные по брони</div>
                        <div className="text-white text-sm flex items-start gap-2">
                          <Phone className="w-4 h-4 mt-0.5 text-slate-300" />
                          <div>
                            <div>Клиент: {reservation.contactPhone || "Не указан"}</div>
                            <div className="text-slate-300 mt-1">Менеджер: {reservation.managerName || "Не указан"}</div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <a
                      href={telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="catalog-button w-full text-center"
                    >
                      {isReservedMode ? "Обсудить бронь в Telegram" : "Заказать через Telegram"}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {isFullscreen && photos.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0, 0, 0, 0.95)" }}
          onClick={() => setIsFullscreen(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            onClick={() => setIsFullscreen(false)}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div
            className="flex items-center justify-center"
            style={{
              width: "90vw",
              height: "80vh",
              maxWidth: "1200px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentPhoto?.url}
              alt={`${container.name} - фото ${currentPhotoIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              style={{
                minWidth: "50%",
                minHeight: "50%",
              }}
              draggable={false}
            />
          </div>

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevPhoto();
                }}
                className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full items-center justify-center text-white transition-colors hover:bg-white/20"
                style={{ background: "rgba(20, 30, 50, 0.6)" }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextPhoto();
                }}
                className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full items-center justify-center text-white transition-colors hover:bg-white/20"
                style={{ background: "rgba(20, 30, 50, 0.6)" }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-lg text-white text-sm font-medium">
            {currentPhotoIndex + 1} / {photos.length}
          </div>

          <div className="sm:hidden absolute bottom-16 left-1/2 -translate-x-1/2 text-white/50 text-xs">
            Свайпните для переключения
          </div>
        </div>
      )}
    </div>
  );
}
