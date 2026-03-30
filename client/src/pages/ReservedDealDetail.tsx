import { useMemo } from "react";
import { Link, useParams } from "wouter";
import { Loader2, Phone, CalendarClock, Package2, ArrowLeft } from "lucide-react";
import CatalogHeader from "@/components/CatalogHeader";
import { trpc } from "@/lib/trpc";

function formatPrice(price: string | number | null | undefined) {
  if (price === null || price === undefined || price === "") return "Цена по запросу";
  const num = typeof price === "number" ? price : parseFloat(price);
  if (!Number.isFinite(num)) return "Цена по запросу";
  return `${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₽`;
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

function buildTelegramUrl(dealId: number, dealName: string, containerNames: string[]) {
  const message = encodeURIComponent(
    [
      `Здравствуйте! Хочу обсудить бронь по сделке #${dealId}.`,
      dealName ? `Сделка: ${dealName}` : "",
      containerNames.length > 0 ? `Контейнеры: ${containerNames.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return `https://t.me/+79686922531?text=${message}`;
}

export default function ReservedDealDetail() {
  const params = useParams<{ dealId: string }>();
  const dealId = parseInt(params.dealId || "0", 10);

  const { data, isLoading, error } = trpc.reservations.getByDealId.useQuery(
    { dealId },
    { enabled: dealId > 0 },
  );

  const telegramUrl = useMemo(() => {
    if (!data) return "https://t.me/+79686922531";
    return buildTelegramUrl(
      data.dealId,
      data.dealName,
      data.containers.map((container) => container.containerNumber),
    );
  }, [data]);

  const hasActiveContainers = !!data?.active && (data?.containers?.length ?? 0) > 0;

  if (isLoading) {
    return (
      <div className="detail-page min-h-screen">
        <CatalogHeader />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="detail-page min-h-screen">
        <CatalogHeader />
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div
            className="rounded-2xl p-6 sm:p-8 shadow-lg"
            style={{
              background: "oklab(0.279 -0.00709772 -0.040381 / 0.18)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(148, 163, 184, 0.12)",
            }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Страница брони недоступна</h1>
            <p className="text-slate-300 mb-6">
              Не удалось загрузить актуальные данные по этой броне.
            </p>
            <Link href="/" className="inline-flex items-center gap-2 text-slate-200 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Вернуться в каталог
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="detail-page min-h-screen">
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
            href="/"
            className="inline-flex items-center gap-2 mb-4 sm:mb-6 transition-all hover:gap-3 active:scale-95"
            style={{
              color: "oklch(0.869 0.022 252.894)",
              padding: "12px 16px",
              margin: "-12px -16px 0 -16px",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-base font-medium">Вернуться в каталог</span>
          </Link>

          <div className="flex flex-col gap-6">
            <section
              className="rounded-2xl border p-5 sm:p-6"
              style={{
                background: "linear-gradient(135deg, rgba(17, 24, 39, 0.7) 0%, rgba(30, 41, 59, 0.55) 100%)",
                borderColor: "rgba(148, 163, 184, 0.16)",
              }}
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-300/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">
                    <Package2 className="w-3.5 h-3.5" />
                    Бронь контейнеров
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">{data.dealName}</h1>
                    <p className="text-slate-300 mt-1">
                      Сделка #{data.dealId}. Эта страница доступна только по прямой ссылке и показывает
                      текущий состав активной брони.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 lg:min-w-[360px]">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-1">Телефон клиента</div>
                    <div className="text-white font-semibold">
                      {data.contactPhone || "Не указан"}
                    </div>
                    {data.contactPhone ? (
                      <a
                        href={`tel:${data.contactPhone.replace(/[^\d+]/g, "")}`}
                        className="inline-flex items-center gap-2 mt-3 text-sm text-slate-200 hover:text-white transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        Позвонить
                      </a>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-1">Контакт / менеджер</div>
                    <div className="text-white font-semibold">
                      {data.contactName || "Контакт не указан"}
                    </div>
                    <div className="text-sm text-slate-300 mt-2">Менеджер: {data.managerName}</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-5">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Контейнеров в брони</div>
                  <div className="text-white text-2xl font-bold">{data.containers.length}</div>
                </div>

                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="catalog-button"
                >
                  Обсудить бронь в Telegram
                </a>
              </div>
            </section>

            {!hasActiveContainers ? (
              <section
                className="rounded-2xl p-6 sm:p-8 border"
                style={{
                  background: "rgba(15, 23, 42, 0.4)",
                  borderColor: "rgba(148, 163, 184, 0.12)",
                }}
              >
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Бронь больше неактуальна</h2>
                <p className="text-slate-300 max-w-3xl">
                  В этой сделке сейчас нет активных зарезервированных контейнеров. Это могло произойти,
                  если бронь закончилась, контейнеры были удалены из сделки или переведены в другой статус.
                </p>
              </section>
            ) : (
              <section className="space-y-4">
                {data.containers.map((container) => {
                  const condition = container.condition ?? "used";
                  const cardGradient =
                    condition === "new"
                      ? "linear-gradient(to right bottom, oklab(0.279 -0.00709772 -0.040381 / 0.82) 0%, oklab(0.379 -0.0113991 -0.145554 / 0.72) 100%)"
                      : "linear-gradient(to right bottom, oklab(0.372 -0.00968297 -0.0429213 / 0.82) 0%, oklab(0.279 -0.00709772 -0.040381 / 0.72) 100%)";

                  return (
                    <article
                      key={container.id}
                      className="rounded-2xl overflow-hidden border shadow-lg"
                      style={{
                        background: cardGradient,
                        borderColor: "rgba(148, 163, 184, 0.18)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                      }}
                    >
                      <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
                        <div className="relative min-h-[240px] lg:min-h-[100%] bg-slate-800/20">
                          {container.mainPhoto ? (
                            <img
                              src={container.mainPhoto}
                              alt={container.name}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-300/70">
                              <Package2 className="w-14 h-14" />
                            </div>
                          )}
                          <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-bold text-white">
                            В броне
                          </div>
                        </div>

                        <div className="p-5 sm:p-6 flex flex-col gap-5">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div>
                              <h2 className="text-xl sm:text-2xl font-bold text-white">{container.name}</h2>
                              <p className="text-slate-200 mt-1">{container.containerNumber}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 min-w-[220px]">
                              <div className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-1">Срок брони</div>
                              <div className="text-white font-semibold flex items-center gap-2">
                                <CalendarClock className="w-4 h-4" />
                                До {formatDate(container.reserveEnd)}
                              </div>
                              <div className="text-sm text-slate-300 mt-2">
                                {typeof container.reserveDays === "number"
                                  ? `Длительность брони: ${container.reserveDays} дн.`
                                  : "Длительность брони не указана"}
                              </div>
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                              <div className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-1">Тип контейнера</div>
                              <div className="text-white font-semibold">{container.size || container.containerType || "Не указан"}</div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                              <div className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-1">Терминал</div>
                              <div className="text-white font-semibold">{container.terminal}</div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                              <div className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-1">Цена в каталоге</div>
                              <div className="text-white font-semibold">{formatPrice(container.price)}</div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                              <div className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-1">Цена по брони</div>
                              <div className="text-white font-semibold">{formatPrice(container.recommendedPrice)}</div>
                            </div>
                          </div>

                          {container.description ? (
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                              <div className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-2">Описание</div>
                              <p className="text-slate-100 leading-relaxed">{container.description}</p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
