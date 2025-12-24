import { Link } from "wouter";
import { Button } from "@/components/ui/button";

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
    return new Intl.NumberFormat("ru-RU", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num) + " ₽";
  };

  return (
    <div className="catalog-card overflow-hidden group">
      {/* Photo Section */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {mainPhoto ? (
          <img
            src={mainPhoto}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <svg className="w-16 h-16 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={condition === "new" ? "badge-new" : "badge-used"}>
            {condition === "new" ? "Новый" : "Б/У"}
          </span>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-white mb-3">{name}</h3>
        
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <p className="text-xs text-[var(--catalog-muted)]">Размер</p>
            <p className="text-sm text-white">{size}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--catalog-muted)]">ID</p>
            <p className="text-sm text-white truncate">{externalId}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="price-text text-lg">{formatPrice(price)}</p>
          <Link href={`/container/${id}`}>
            <Button 
              variant="outline" 
              size="sm"
              className="border-blue-500 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
            >
              Смотреть
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
