import { Link } from "wouter";

interface ContainerCardProps {
  id: number;
  externalId: string;
  name: string;
  size: string;
  condition: "new" | "used";
  price: string | null;
  mainPhoto: string | null;
}

export default function ContainerCard({
  id,
  externalId,
  name,
  size,
  condition,
  price,
  mainPhoto,
}: ContainerCardProps) {
  const formatPrice = (price: string | null) => {
    if (!price) return "Цена по запросу";
    const num = parseFloat(price);
    // Use space as thousands separator and dot for decimals (matching original)
    const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return formatted + " ₽";
  };

  return (
    <Link href={`/container/${id}`}>
      <div className="catalog-card group cursor-pointer">
        {/* Photo Section with zoom effect */}
        <div className="relative h-32 sm:h-40 bg-slate-700 overflow-hidden flex-shrink-0">
          {mainPhoto ? (
            <img
              src={mainPhoto}
              alt={name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-slate-700/50 flex items-center justify-center">
              <svg className="w-16 h-16 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          {/* Status Badge - BLUE for "Новый", gray for "Б/У" */}
          <div className={`absolute top-3 right-3 text-slate-100 text-xs font-semibold px-3 py-1 rounded-full ${
            condition === "new" ? "bg-blue-500/90" : "bg-slate-700/80"
          }`}>
            {condition === "new" ? "Новый" : "Б/У"}
          </div>
        </div>

        {/* Info Section - matching original structure */}
        <div className="flex-1 p-3 sm:p-4 bg-slate-900/5 backdrop-blur-sm flex flex-col justify-between">
          <h3 className="text-white font-bold text-base sm:text-lg line-clamp-1 mb-2 sm:mb-3">{name}</h3>
          
          <div className="flex justify-between mb-2 sm:mb-3 text-xs sm:text-sm">
            <div>
              <div className="text-slate-400 text-xs mb-1">Размер</div>
              <div className="text-slate-100 font-semibold">{size}</div>
            </div>
            <div className="text-right">
              <div className="text-slate-400 text-xs mb-1">ID</div>
              <div className="text-slate-100 font-semibold">{externalId}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
            {/* Price - WHITE color */}
            <div className="text-white font-bold text-base sm:text-lg">{formatPrice(price)}</div>
            <button className="catalog-button w-full sm:w-40 h-10 sm:h-12 text-sm sm:text-base">
              Смотреть
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
