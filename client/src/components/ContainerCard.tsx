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

  // Card background gradients from reference site
  // Б/У (used): gray-blue gradient
  // Новый (new): darker blue gradient
  const cardGradient = condition === "new" 
    ? "linear-gradient(to right bottom, oklab(0.279 -0.00709772 -0.040381 / 0.75) 0%, oklab(0.379 -0.0113991 -0.145554 / 0.65) 100%)"
    : "linear-gradient(to right bottom, oklab(0.372 -0.00968297 -0.0429213 / 0.75) 0%, oklab(0.279 -0.00709772 -0.040381 / 0.65) 100%)";

  // Badge colors - more contrasting for visibility
  // Новый: brighter blue
  // Б/У: lighter gray-blue for better contrast
  const badgeStyle = condition === "new"
    ? { background: "oklab(0.511 0.0317755 -0.260066 / 0.9)" }
    : { background: "rgba(100, 116, 139, 0.9)" }; // Lighter gray for better visibility

  return (
    <Link href={`/container/${id}`}>
      <div 
        className="catalog-card group cursor-pointer rounded-xl overflow-hidden"
        style={{ 
          background: cardGradient,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}
      >
        {/* Photo Section with zoom effect */}
        <div className="relative h-32 sm:h-40 overflow-hidden flex-shrink-0">
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
          
          {/* Status Badge - more visible colors */}
          <div 
            className="absolute top-3 right-3 text-xs font-semibold px-3 py-1 rounded-full"
            style={{ 
              ...badgeStyle,
              color: "#fff"
            }}
          >
            {condition === "new" ? "Новый" : "Б/У"}
          </div>
        </div>

        {/* Info Section - extended to include title */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between">
          {/* Title now part of card content */}
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
