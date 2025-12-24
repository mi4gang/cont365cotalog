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
    <div className="catalog-card group">
      {/* Photo Section with zoom effect */}
      <div className="relative overflow-hidden" style={{ height: '160px' }}>
        {mainPhoto ? (
          <img
            src={mainPhoto}
            alt={name}
            className="catalog-card-image"
          />
        ) : (
          <div className="w-full h-full bg-slate-700/50 flex items-center justify-center">
            <svg className="w-16 h-16 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Status Badge - exact position and style */}
        <div className={`catalog-badge ${condition === "new" ? "catalog-badge-new" : ""}`}>
          {condition === "new" ? "Новый" : "Б/У"}
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4">
        <h3 className="catalog-card-title">{name}</h3>
        
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <p className="catalog-label">Размер</p>
            <p className="catalog-value">{size}</p>
          </div>
          <div>
            <p className="catalog-label">ID</p>
            <p className="catalog-value truncate">{externalId}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="catalog-price">{formatPrice(price)}</p>
          <Link href={`/container/${id}`}>
            <button className="catalog-button">
              Смотреть
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
