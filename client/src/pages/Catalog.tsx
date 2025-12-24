import { useState } from "react";
import { trpc } from "@/lib/trpc";
import CatalogHeader from "@/components/CatalogHeader";
import ContainerCard from "@/components/ContainerCard";
import { Search, Loader2, ChevronDown } from "lucide-react";

export default function Catalog() {
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [conditionDropdownOpen, setConditionDropdownOpen] = useState(false);

  const { data: containers, isLoading } = trpc.containers.list.useQuery({
    size: sizeFilter !== "all" ? sizeFilter : undefined,
    condition: conditionFilter !== "all" ? (conditionFilter as "new" | "used") : undefined,
    search: searchQuery || undefined,
  });

  const { data: sizes } = trpc.containers.getSizes.useQuery();

  const getSizeLabel = () => {
    if (sizeFilter === "all") return "Размер";
    return sizeFilter;
  };

  const getConditionLabel = () => {
    if (conditionFilter === "all") return "Состояние";
    if (conditionFilter === "new") return "Новый";
    return "Б/У";
  };

  return (
    <div className="catalog-page">
      <CatalogHeader />

      <main className="container py-6">
        {/* Filters - exact match from original */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Size Filter Dropdown */}
          <div className="relative">
            <button
              className="catalog-filter-btn"
              onClick={() => {
                setSizeDropdownOpen(!sizeDropdownOpen);
                setConditionDropdownOpen(false);
              }}
            >
              <span>{getSizeLabel()}</span>
              <ChevronDown className="w-4 h-4 opacity-60" />
            </button>
            {sizeDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800/95 backdrop-blur-sm border border-slate-600/30 rounded-lg shadow-xl z-50 overflow-hidden">
                <button
                  className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/50 transition-colors"
                  onClick={() => {
                    setSizeFilter("all");
                    setSizeDropdownOpen(false);
                  }}
                >
                  Все размеры
                </button>
                {sizes?.map((size) => (
                  <button
                    key={size}
                    className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/50 transition-colors"
                    onClick={() => {
                      setSizeFilter(size);
                      setSizeDropdownOpen(false);
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Condition Filter Dropdown */}
          <div className="relative">
            <button
              className="catalog-filter-btn"
              onClick={() => {
                setConditionDropdownOpen(!conditionDropdownOpen);
                setSizeDropdownOpen(false);
              }}
            >
              <span>{getConditionLabel()}</span>
              <ChevronDown className="w-4 h-4 opacity-60" />
            </button>
            {conditionDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-slate-800/95 backdrop-blur-sm border border-slate-600/30 rounded-lg shadow-xl z-50 overflow-hidden">
                <button
                  className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/50 transition-colors"
                  onClick={() => {
                    setConditionFilter("all");
                    setConditionDropdownOpen(false);
                  }}
                >
                  Все
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/50 transition-colors"
                  onClick={() => {
                    setConditionFilter("new");
                    setConditionDropdownOpen(false);
                  }}
                >
                  Новый
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/50 transition-colors"
                  onClick={() => {
                    setConditionFilter("used");
                    setConditionDropdownOpen(false);
                  }}
                >
                  Б/У
                </button>
              </div>
            )}
          </div>

          {/* Found count */}
          <div className="catalog-found">
            Найдено: <span className="catalog-found-count">{containers?.length || 0}</span>
          </div>

          <div className="flex-1" />

          {/* Search input - exact match */}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400/60" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="catalog-search"
            />
          </div>
        </div>

        {/* Click outside to close dropdowns */}
        {(sizeDropdownOpen || conditionDropdownOpen) && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setSizeDropdownOpen(false);
              setConditionDropdownOpen(false);
            }}
          />
        )}

        {/* Container Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : containers && containers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {containers.map((container) => (
              <ContainerCard
                key={container.id}
                id={container.id}
                externalId={container.externalId}
                name={container.name}
                size={container.size}
                condition={container.condition}
                price={container.price}
                mainPhoto={container.mainPhoto}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-slate-400 text-lg">Контейнеры не найдены</div>
            <p className="text-slate-500 mt-2">Попробуйте изменить параметры поиска</p>
          </div>
        )}
      </main>
    </div>
  );
}
