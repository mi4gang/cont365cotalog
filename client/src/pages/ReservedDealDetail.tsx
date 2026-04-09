import { useMemo } from "react";
import { Link, useParams } from "wouter";
import { Loader2, ArrowLeft, Package2 } from "lucide-react";
import CatalogHeader from "@/components/CatalogHeader";
import ContainerCard from "@/components/ContainerCard";
import { trpc } from "@/lib/trpc";
import { buildContainerTitle } from "@shared/containerNaming";

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

function buildTelegramUrl(dealId: number) {
  const message = encodeURIComponent(
    `Здравствуйте! Хочу обсудить бронь по сделке #${dealId}.`,
  );
  return `https://t.me/+79686922531?text=${message}`;
}

function formatQuantity(value?: number | null) {
  const quantity = Number.isInteger(value) && Number(value) > 0 ? Number(value) : 1;
  return `${quantity} шт.`;
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
    return buildTelegramUrl(data.dealId);
  }, [data]);

  const hasActiveContainers = !!data?.active && (data?.containers?.length ?? 0) > 0;
  const reservedPositionsCount = data?.containers.length ?? 0;
  const reservedTotalQuantity = data?.totalQuantity ?? 0;

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
    <div className="catalog-page min-h-screen">
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, overflow: "hidden" }}>
        <img src="/container-terminal-bg.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", opacity: 0.5 }} />
      </div>
      <CatalogHeader />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="catalog-glass-container p-3 sm:p-6" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
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

          <section
            className="rounded-2xl border p-5 sm:p-6 mb-6"
            style={{
              background: "linear-gradient(135deg, rgba(17, 24, 39, 0.7) 0%, rgba(30, 41, 59, 0.55) 100%)",
              borderColor: "rgba(148, 163, 184, 0.16)",
            }}
          >
            <div className="flex flex-col gap-5">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-300/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">
                  <Package2 className="w-3.5 h-3.5" />
                  Бронь контейнеров
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">Сделка #{data.dealId}</h1>
                  <p className="text-slate-300 mt-1">
                    Это приватная страница брони. Здесь виден только текущий состав контейнеров, закрепленных за сделкой.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-1">Телефон клиента</div>
                  <div className="text-white font-semibold">{data.contactPhone || "Не указан"}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-1">Менеджер</div>
                  <div className="text-white font-semibold">{data.managerName || "Не указан"}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-400 mb-1">Контейнеров в брони</div>
                  <div className="text-white text-2xl font-bold">{reservedTotalQuantity}</div>
                  <div className="text-slate-300 text-sm mt-1">
                    {reservedPositionsCount} поз. в сделке
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="catalog-button"
                >
                  Обсудить бронь в Telegram
                </a>
              </div>
            </div>
          </section>

          {!hasActiveContainers ? (
            <section className="text-center py-16 sm:py-20">
              <div className="text-slate-300 text-base sm:text-lg">Бронь больше неактуальна</div>
              <p className="text-slate-400 mt-2 text-sm sm:text-base">
                В этой сделке сейчас нет активных зарезервированных контейнеров.
              </p>
            </section>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {data.containers.map((container) => (
                <ContainerCard
                  key={container.id}
                  id={container.catalogContainerId ?? 0}
                  externalId={container.externalId ?? container.containerNumber}
                  name={buildContainerTitle(container.name, container.size || container.containerType, container.serial)}
                  size={container.size || container.containerType || "Не указан"}
                  condition={container.condition ?? "used"}
                  price={container.price}
                  mainPhoto={container.mainPhoto}
                  terminalLocation={container.terminal}
                  serial={container.serial}
                  href={`/reserve/deal/${data.dealId}/container/${encodeURIComponent(
                    container.catalogContainerId
                      ? `catalog-${container.catalogContainerId}`
                      : (container.externalId ?? container.containerNumber),
                  )}`}
                  badgeText="В брони"
                  badgeTone="reserved"
                  detailNote={
                    container.reserveEnd
                      ? `В брони: ${formatQuantity(container.quantity)} · до ${formatDate(container.reserveEnd)}`
                      : `В брони: ${formatQuantity(container.quantity)}`
                  }
                  actionLabel="Открыть"
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
