import { useState, useRef, useEffect } from "react";
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
  
  const sizeDropdownRef = useRef<HTMLDivElement>(null);
  const conditionDropdownRef = useRef<HTMLDivElement>(null);

  const { data: containers, isLoading } = trpc.containers.list.useQuery({
    size: sizeFilter !== "all" ? sizeFilter : undefined,
    condition: conditionFilter !== "all" ? (conditionFilter as "new" | "used") : undefined,
    search: searchQuery || undefined,
  });

  const { data: sizes } = trpc.containers.getSizes.useQuery();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(event.target as Node)) {
        setSizeDropdownOpen(false);
      }
      if (conditionDropdownRef.current && !conditionDropdownRef.current.contains(event.target as Node)) {
        setConditionDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getSizeLabel = () => {
    if (sizeFilter === "all") return "Размер";
    return sizeFilter;
  };

  const getConditionLabel = () => {
    if (conditionFilter === "all") return "Состояние";
    if (conditionFilter === "new") return "Новый";
    return "Б/У";
  };

  const handleSizeSelect = (size: string) => {
    setSizeFilter(size);
    setSizeDropdownOpen(false);
  };

  const handleConditionSelect = (condition: string) => {
    setConditionFilter(condition);
    setConditionDropdownOpen(false);
  };

  return (
    <div className="catalog-page min-h-screen">
      <CatalogHeader />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Glassmorphism Container for entire catalog */}
        <div className="catalog-glass-container p-3 sm:p-6">
          {/* Filters Row - responsive layout */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            {/* Filter buttons row */}
            <div className="flex gap-2 sm:gap-3">
              {/* Size Filter Dropdown */}
              <div className="relative flex-1 sm:flex-none" ref={sizeDropdownRef}>
                <button
                  className="catalog-filter-btn w-full sm:w-auto min-w-0 sm:min-w-[140px]"
                  onClick={() => {
                    setSizeDropdownOpen(!sizeDropdownOpen);
                    setConditionDropdownOpen(false);
                  }}
                >
                  <span className="truncate text-sm sm:text-base">{getSizeLabel()}</span>
                  <ChevronDown className={`w-4 h-4 opacity-60 transition-transform flex-shrink-0 ${sizeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {sizeDropdownOpen && (
                  <div className="catalog-filter-dropdown absolute top-full left-0 mt-1 z-50 w-full sm:w-auto">
                    <div
                      className={`catalog-filter-option ${sizeFilter === "all" ? "selected" : ""}`}
                      onClick={() => handleSizeSelect("all")}
                    >
                      Все размеры
                    </div>
                    {sizes?.map((size) => (
                      <div
                        key={size}
                        className={`catalog-filter-option ${sizeFilter === size ? "selected" : ""}`}
                        onClick={() => handleSizeSelect(size)}
                      >
                        {size}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Condition Filter Dropdown */}
              <div className="relative flex-1 sm:flex-none" ref={conditionDropdownRef}>
                <button
                  className="catalog-filter-btn w-full sm:w-auto min-w-0 sm:min-w-[140px]"
                  onClick={() => {
                    setConditionDropdownOpen(!conditionDropdownOpen);
                    setSizeDropdownOpen(false);
                  }}
                >
                  <span className="truncate text-sm sm:text-base">{getConditionLabel()}</span>
                  <ChevronDown className={`w-4 h-4 opacity-60 transition-transform flex-shrink-0 ${conditionDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {conditionDropdownOpen && (
                  <div className="catalog-filter-dropdown absolute top-full left-0 mt-1 z-50 w-full sm:w-auto">
                    <div
                      className={`catalog-filter-option ${conditionFilter === "all" ? "selected" : ""}`}
                      onClick={() => handleConditionSelect("all")}
                    >
                      Все
                    </div>
                    <div
                      className={`catalog-filter-option ${conditionFilter === "new" ? "selected" : ""}`}
                      onClick={() => handleConditionSelect("new")}
                    >
                      Новый
                    </div>
                    <div
                      className={`catalog-filter-option ${conditionFilter === "used" ? "selected" : ""}`}
                      onClick={() => handleConditionSelect("used")}
                    >
                      Б/У
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Found count - hidden on mobile, shown on desktop */}
            <div className="catalog-found hidden sm:block ml-2">
              Найдено: <span className="catalog-found-count">{containers?.length || 0}</span>
            </div>

            <div className="hidden sm:block flex-1" />

            {/* Search input - full width on mobile */}
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400/60" />
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="catalog-search w-full sm:w-[200px] lg:w-[256px] text-sm sm:text-base"
              />
            </div>
            
            {/* Found count - shown on mobile below filters */}
            <div className="catalog-found sm:hidden text-center">
              Найдено: <span className="catalog-found-count">{containers?.length || 0}</span>
            </div>
          </div>

          {/* Container Grid - responsive columns */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16 sm:py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : containers && containers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {containers.map((container) => (
                <ContainerCard
                  key={container.id}
                  id={container.id}
                  externalId={container.externalId}
                  name={`Контейнер ${container.name}`}
                  size={container.size}
                  condition={container.condition}
                  price={container.price}
                  mainPhoto={container.mainPhoto}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 sm:py-20">
              <div className="text-slate-400 text-base sm:text-lg">Контейнеры не найдены</div>
              <p className="text-slate-500 mt-2 text-sm sm:text-base">Попробуйте изменить параметры поиска</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
