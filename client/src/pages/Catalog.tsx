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
    setSizeDropdownOpen(false); // Auto-close on selection
  };

  const handleConditionSelect = (condition: string) => {
    setConditionFilter(condition);
    setConditionDropdownOpen(false); // Auto-close on selection
  };

  return (
    <div className="catalog-page">
      <CatalogHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Glassmorphism Container for entire catalog */}
        <div className="catalog-glass-container">
          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Size Filter Dropdown */}
            <div className="relative" ref={sizeDropdownRef}>
              <button
                className="catalog-filter-btn"
                onClick={() => {
                  setSizeDropdownOpen(!sizeDropdownOpen);
                  setConditionDropdownOpen(false);
                }}
              >
                <span>{getSizeLabel()}</span>
                <ChevronDown className={`w-4 h-4 opacity-60 transition-transform ${sizeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {sizeDropdownOpen && (
                <div className="catalog-filter-dropdown absolute top-full left-0 mt-1 z-50">
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
            <div className="relative" ref={conditionDropdownRef}>
              <button
                className="catalog-filter-btn"
                onClick={() => {
                  setConditionDropdownOpen(!conditionDropdownOpen);
                  setSizeDropdownOpen(false);
                }}
              >
                <span>{getConditionLabel()}</span>
                <ChevronDown className={`w-4 h-4 opacity-60 transition-transform ${conditionDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {conditionDropdownOpen && (
                <div className="catalog-filter-dropdown absolute top-full left-0 mt-1 z-50">
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

            {/* Found count */}
            <div className="catalog-found ml-2">
              Найдено: <span className="catalog-found-count">{containers?.length || 0}</span>
            </div>

            <div className="flex-1" />

            {/* Search input */}
            <div className="relative">
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

          {/* Container Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : containers && containers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
        </div>
      </main>
    </div>
  );
}
