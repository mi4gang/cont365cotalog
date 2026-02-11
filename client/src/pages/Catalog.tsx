import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import CatalogHeader from "@/components/CatalogHeader";
import ContainerCard from "@/components/ContainerCard";
import { Search, Loader2, ChevronDown } from "lucide-react";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

export default function Catalog() {
  // State for filters (using actual string values for logic)
  const [sizeFilters, setSizeFilters] = useState<string[]>([]);
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [terminalFilters, setTerminalFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceFrom, setPriceFrom] = useState<string>("");
  const [priceTo, setPriceTo] = useState<string>("");
  
  // UI States
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [conditionDropdownOpen, setConditionDropdownOpen] = useState(false);
  const [terminalDropdownOpen, setTerminalDropdownOpen] = useState(false);
  const [priceDropdownOpen, setPriceDropdownOpen] = useState(false);
  const [sliderValues, setSliderValues] = useState<[number, number]>([0, 1000000]);
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sliderInitialized, setSliderInitialized] = useState(false);
  
  // Debounced price values for query
  const [debouncedPriceFrom, setDebouncedPriceFrom] = useState<string>("");
  const [debouncedPriceTo, setDebouncedPriceTo] = useState<string>("");
  
  const sizeDropdownRef = useRef<HTMLDivElement>(null);
  const conditionDropdownRef = useRef<HTMLDivElement>(null);
  const terminalDropdownRef = useRef<HTMLDivElement>(null);
  const priceDropdownRef = useRef<HTMLDivElement>(null);
  const priceMobileAccordionRef = useRef<HTMLDivElement>(null);

  // Fetch unique values from DB to build the ID mapping
  const { data: availableSizes } = trpc.containers.getSizes.useQuery();
  const { data: availableTerminals } = trpc.containers.getTerminals.useQuery();

  // Helper to generate a stable, URL-safe ID from a string
  const generateStableId = (text: string) => {
    // Simple transliteration for Russian characters to keep IDs readable and stable
    const ru: Record<string, string> = {
      'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch','ь':'','ы':'y','ъ':'','э':'e','ю':'yu','я':'ya'
    };
    return text
      .toLowerCase()
      .split('')
      .map(char => ru[char] || char)
      .join('')
      .replace(/[^a-z0-9]/g, '') // Remove special characters
      .slice(0, 12); // Keep it reasonably short but unique
  };

  // Create mappings: String -> ID and ID -> String
  const mappings = useMemo(() => {
    const sizeToId: Record<string, string> = {};
    const idToSize: Record<string, string> = {};
    const terminalToId: Record<string, string> = {};
    const idToTerminal: Record<string, string> = {};

    if (availableSizes) {
      availableSizes.forEach((size) => {
        const id = generateStableId(size);
        sizeToId[size] = id;
        idToSize[id] = size;
      });
    }

    if (availableTerminals) {
      availableTerminals.forEach((terminal) => {
        const id = generateStableId(terminal);
        terminalToId[terminal] = id;
        idToTerminal[id] = terminal;
      });
    }

    return { sizeToId, idToSize, terminalToId, idToTerminal };
  }, [availableSizes, availableTerminals]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize from URL or localStorage
  useEffect(() => {
    if (!availableSizes || !availableTerminals) return; // Wait for mappings to be ready
    if (isInitialized) return;

    const params = new URLSearchParams(window.location.search);
    const hasUrlParams = params.toString().length > 0;
    
    // 1. Try URL first
    const urlSizeIds = params.get("s")?.split(",").filter(Boolean) || [];
    let initialSizes = urlSizeIds.map(id => mappings.idToSize[id]).filter((s): s is string => !!s);
    
    const urlTerminalIds = params.get("t")?.split(",").filter(Boolean) || [];
    let initialTerminals = urlTerminalIds.map(id => mappings.idToTerminal[id]).filter((t): t is string => !!t);
    
    let initialCondition = params.get("c");
    let initialPriceFrom = params.get("pf");
    let initialPriceTo = params.get("pt");
    let initialSearch = params.get("q");

    // 2. If no URL params, try localStorage
    if (!hasUrlParams) {
      try {
        const saved = localStorage.getItem('catalog_filters');
        if (saved) {
          const parsed = JSON.parse(saved);
          initialSizes = parsed.sizes || [];
          initialTerminals = parsed.terminals || [];
          initialCondition = parsed.condition || "all";
          initialPriceFrom = parsed.priceFrom || "";
          initialPriceTo = parsed.priceTo || "";
          initialSearch = parsed.search || "";
        }
      } catch (e) {
        console.error("Failed to load filters from localStorage", e);
      }
    }

    // Apply values
    if (initialSizes.length > 0) setSizeFilters(initialSizes);
    if (initialTerminals.length > 0) setTerminalFilters(initialTerminals);
    if (initialCondition) setConditionFilter(initialCondition);
    if (initialPriceFrom) {
      setPriceFrom(initialPriceFrom);
      const val = parseFloat(initialPriceFrom);
      if (!isNaN(val)) setSliderValues(prev => [val, prev[1]]);
    }
    if (initialPriceTo) {
      setPriceTo(initialPriceTo);
      const val = parseFloat(initialPriceTo);
      if (!isNaN(val)) setSliderValues(prev => [prev[0], val]);
    }
    if (initialSearch) setSearchQuery(initialSearch);

    setIsInitialized(true);
  }, [availableSizes, availableTerminals, mappings, isInitialized]);

  // Sync to URL using IDs
  useEffect(() => {
    if (!isInitialized) return;

    const params = new URLSearchParams();
    
    // Map strings to IDs for URL
    if (sizeFilters.length > 0) {
      const ids = sizeFilters
        .map(s => mappings.sizeToId[s])
        .filter(Boolean)
        .join(",");
      if (ids) params.set("s", ids);
    }

    if (terminalFilters.length > 0) {
      const ids = terminalFilters
        .map(t => mappings.terminalToId[t])
        .filter(Boolean)
        .join(",");
      if (ids) params.set("t", ids);
    }

    if (conditionFilter !== "all") params.set("c", conditionFilter);
    if (priceFrom) params.set("pf", priceFrom);
    if (priceTo) params.set("pt", priceTo);
    if (searchQuery) params.set("q", searchQuery);

    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;
    
    if (window.location.search !== (queryString ? `?${queryString}` : "")) {
      window.history.replaceState({}, "", newUrl);
    }

    // Save to localStorage for persistence between page transitions
    try {
      localStorage.setItem('catalog_filters', JSON.stringify({
        sizes: sizeFilters,
        terminals: terminalFilters,
        condition: conditionFilter,
        priceFrom,
        priceTo,
        search: searchQuery
      }));
    } catch (e) {
      console.error("Failed to save filters to localStorage", e);
    }
  }, [sizeFilters, conditionFilter, terminalFilters, priceFrom, priceTo, searchQuery, isInitialized, mappings]);

  // Debounce price
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPriceFrom(priceFrom);
      setDebouncedPriceTo(priceTo);
    }, 300);
    return () => clearTimeout(timer);
  }, [priceFrom, priceTo]);

  // Data Queries
  const { data: containers, isLoading } = trpc.containers.list.useQuery({
    sizes: sizeFilters.length > 0 ? sizeFilters : undefined,
    condition: conditionFilter !== "all" ? (conditionFilter as "new" | "used") : undefined,
    terminals: terminalFilters.length > 0 ? terminalFilters : undefined,
    search: searchQuery || undefined,
    priceFrom: debouncedPriceFrom ? parseFloat(debouncedPriceFrom) : undefined,
    priceTo: debouncedPriceTo ? parseFloat(debouncedPriceTo) : undefined,
  });

  const { data: containersForPriceRange } = trpc.containers.list.useQuery({
    sizes: sizeFilters.length > 0 ? sizeFilters : undefined,
    condition: conditionFilter !== "all" ? (conditionFilter as "new" | "used") : undefined,
    terminals: terminalFilters.length > 0 ? terminalFilters : undefined,
    search: searchQuery || undefined,
  });

  const priceRange = useMemo(() => {
    if (!containersForPriceRange || containersForPriceRange.length === 0) return { min: 0, max: 1000000 };
    const prices = containersForPriceRange.map(c => parseFloat(c.price || "0")).filter(p => p > 0);
    if (prices.length === 0) return { min: 0, max: 1000000 };
    return {
      min: Math.floor(Math.min(...prices) / 1000) * 1000,
      max: Math.max(...prices)
    };
  }, [containersForPriceRange]);

  useEffect(() => {
    if (containersForPriceRange && containersForPriceRange.length > 0 && !sliderInitialized) {
      if (!priceFrom && !priceTo) {
        setSliderValues([priceRange.min, priceRange.max]);
      }
      setSliderInitialized(true);
    }
  }, [priceRange, containersForPriceRange, sliderInitialized, priceFrom, priceTo]);

  // Handlers
  const handleSizeSelect = (size: string) => {
    setSizeFilters(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  };

  const handleTerminalSelect = (terminal: string) => {
    setTerminalFilters(prev => prev.includes(terminal) ? prev.filter(t => t !== terminal) : [...prev, terminal]);
  };

  const handlePriceReset = () => {
    setPriceFrom("");
    setPriceTo("");
    setSliderValues([priceRange.min, priceRange.max]);
  };

  // Labels
  const getSizeLabel = () => sizeFilters.length === 0 ? "Размер" : (sizeFilters.length === 1 ? sizeFilters[0] : `Размер (${sizeFilters.length})`);
  const getConditionLabel = () => conditionFilter === "all" ? "Состояние" : (conditionFilter === "new" ? "Новый" : "Б/У");
  const getTerminalLabel = () => terminalFilters.length === 0 ? "Локация" : (terminalFilters.length === 1 ? terminalFilters[0] : `Локация (${terminalFilters.length})`);
  const getPriceLabel = () => {
    if (isMobile || (!priceFrom && !priceTo)) return "Цена";
    if (priceFrom && priceTo) return `${parseInt(priceFrom).toLocaleString()}-${parseInt(priceTo).toLocaleString()} ₽`;
    return priceFrom ? `от ${parseInt(priceFrom).toLocaleString()} ₽` : `до ${parseInt(priceTo).toLocaleString()} ₽`;
  };

  // Click Outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(e.target as Node)) setSizeDropdownOpen(false);
      if (conditionDropdownRef.current && !conditionDropdownRef.current.contains(e.target as Node)) setConditionDropdownOpen(false);
      if (terminalDropdownRef.current && !terminalDropdownRef.current.contains(e.target as Node)) setTerminalDropdownOpen(false);
      if (priceDropdownRef.current && !priceDropdownRef.current.contains(e.target as Node)) {
        if (priceMobileAccordionRef.current && priceMobileAccordionRef.current.contains(e.target as Node)) return;
        setPriceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="catalog-page">
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, overflow: 'hidden' }}>
        <img src="/container-terminal-bg.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', opacity: 0.5 }} />
      </div>
      <CatalogHeader />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="catalog-glass-container p-3 sm:p-6" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Size Filter */}
              <div className="relative flex-1 sm:flex-none" ref={sizeDropdownRef}>
                <button className="catalog-filter-btn w-full sm:w-auto min-w-0 sm:min-w-[140px]" onClick={() => { setSizeDropdownOpen(!sizeDropdownOpen); setConditionDropdownOpen(false); setTerminalDropdownOpen(false); setPriceDropdownOpen(false); }}>
                  <span className="truncate text-sm sm:text-base">{getSizeLabel()}</span>
                  <ChevronDown className={`w-4 h-4 opacity-60 transition-transform flex-shrink-0 ${sizeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {sizeDropdownOpen && (
                  <div className="catalog-filter-dropdown absolute top-full left-0 mt-1 z-50 w-full sm:w-auto">
                    {availableSizes?.map((size) => (
                      <div key={size} className={`catalog-filter-option ${sizeFilters.includes(size) ? "selected" : ""}`} onClick={() => handleSizeSelect(size)}>{size}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Condition Filter */}
              <div className="relative flex-1 sm:flex-none" ref={conditionDropdownRef}>
                <button className="catalog-filter-btn w-full sm:w-auto min-w-0 sm:min-w-[140px]" onClick={() => { setConditionDropdownOpen(!conditionDropdownOpen); setSizeDropdownOpen(false); setTerminalDropdownOpen(false); setPriceDropdownOpen(false); }}>
                  <span className="truncate text-sm sm:text-base">{getConditionLabel()}</span>
                  <ChevronDown className={`w-4 h-4 opacity-60 transition-transform flex-shrink-0 ${conditionDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {conditionDropdownOpen && (
                  <div className="catalog-filter-dropdown absolute top-full left-0 mt-1 z-50 w-full sm:w-auto">
                    <div className={`catalog-filter-option ${conditionFilter === "all" ? "selected" : ""}`} onClick={() => { setConditionFilter("all"); setConditionDropdownOpen(false); }}>Все</div>
                    <div className={`catalog-filter-option ${conditionFilter === "new" ? "selected" : ""}`} onClick={() => { setConditionFilter("new"); setConditionDropdownOpen(false); }}>Новый</div>
                    <div className={`catalog-filter-option ${conditionFilter === "used" ? "selected" : ""}`} onClick={() => { setConditionFilter("used"); setConditionDropdownOpen(false); }}>Б/У</div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Terminal Filter */}
              <div className="relative flex-1 sm:flex-none" ref={terminalDropdownRef}>
                <button className="catalog-filter-btn w-full sm:w-auto min-w-0 sm:min-w-[140px]" onClick={() => { setTerminalDropdownOpen(!terminalDropdownOpen); setSizeDropdownOpen(false); setConditionDropdownOpen(false); setPriceDropdownOpen(false); }}>
                  <span className="truncate text-sm sm:text-base">{getTerminalLabel()}</span>
                  <ChevronDown className={`w-4 h-4 opacity-60 transition-transform flex-shrink-0 ${terminalDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {terminalDropdownOpen && (
                  <div className="catalog-filter-dropdown absolute top-full left-0 mt-1 z-50 w-full sm:w-auto">
                    {availableTerminals?.map((terminal) => (
                      <div key={terminal} className={`catalog-filter-option ${terminalFilters.includes(terminal) ? "selected" : ""}`} onClick={() => handleTerminalSelect(terminal)}>{terminal}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Price Filter */}
              <div className="relative flex-1 sm:flex-none" ref={priceDropdownRef}>
                <button className="catalog-filter-btn w-full sm:w-auto min-w-0 sm:min-w-[140px]" onClick={() => { setPriceDropdownOpen(!priceDropdownOpen); setSizeDropdownOpen(false); setConditionDropdownOpen(false); setTerminalDropdownOpen(false); }}>
                  <span className="truncate text-sm sm:text-base">{getPriceLabel()}</span>
                  <ChevronDown className={`w-4 h-4 opacity-60 transition-transform flex-shrink-0 ${priceDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {priceDropdownOpen && !isMobile && (
                  <div className="catalog-filter-dropdown absolute top-full mt-1 z-50 w-80 p-5 left-0">
                    <div className="space-y-4">
                      <div className="px-1">
                        <Slider range min={priceRange.min} max={priceRange.max} step={100} value={sliderValues} onChange={(v) => { if (Array.isArray(v)) { setSliderValues(v as [number, number]); setPriceFrom(v[0].toString()); setPriceTo(v[1].toString()); } }} styles={{ track: { backgroundColor: '#c97a3a', height: 6 }, rail: { backgroundColor: '#334155', height: 6 }, handle: { backgroundColor: '#c97a3a', borderColor: '#c97a3a', width: 20, height: 20, marginTop: -7, opacity: 1, boxShadow: '0 2px 8px rgba(201, 122, 58, 0.4)' } }} />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-slate-300 mb-1.5 block">От</label>
                          <input type="number" value={priceFrom} onChange={(e) => { setPriceFrom(e.target.value); setSliderValues([parseFloat(e.target.value) || priceRange.min, sliderValues[1]]); }} className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/30 rounded text-sm text-white" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-slate-300 mb-1.5 block">До</label>
                          <input type="number" value={priceTo} onChange={(e) => { setPriceTo(e.target.value); setSliderValues([sliderValues[0], parseFloat(e.target.value) || priceRange.max]); }} className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/30 rounded text-sm text-white" />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={handlePriceReset} className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 rounded text-sm font-medium text-white">Сбросить</button>
                        <button onClick={() => setPriceDropdownOpen(false)} className="flex-1 px-4 py-2.5 rounded text-sm font-medium text-white" style={{ backgroundColor: '#c97a3a' }}>Применить</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {priceDropdownOpen && isMobile && (
              <div className="w-full" ref={priceMobileAccordionRef}>
                <div className="catalog-filter-dropdown p-4">
                  <div className="space-y-4">
                    <div className="px-1"><Slider range min={priceRange.min} max={priceRange.max} step={100} value={sliderValues} onChange={(v) => { if (Array.isArray(v)) { setSliderValues(v as [number, number]); setPriceFrom(v[0].toString()); setPriceTo(v[1].toString()); } }} styles={{ track: { backgroundColor: '#c97a3a', height: 6 }, rail: { backgroundColor: '#334155', height: 6 }, handle: { backgroundColor: '#c97a3a', borderColor: '#c97a3a', width: 20, height: 20, marginTop: -7, opacity: 1, boxShadow: '0 2px 8px rgba(201, 122, 58, 0.4)' } }} /></div>
                    <div className="flex gap-3">
                      <div className="flex-1"><label className="text-xs text-slate-300 mb-1.5 block">От</label><input type="number" value={priceFrom} onChange={(e) => { setPriceFrom(e.target.value); setSliderValues([parseFloat(e.target.value) || priceRange.min, sliderValues[1]]); }} className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/30 rounded text-sm text-white" /></div>
                      <div className="flex-1"><label className="text-xs text-slate-300 mb-1.5 block">До</label><input type="number" value={priceTo} onChange={(e) => { setPriceTo(e.target.value); setSliderValues([sliderValues[0], parseFloat(e.target.value) || priceRange.max]); }} className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/30 rounded text-sm text-white" /></div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={handlePriceReset} className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 rounded text-sm font-medium text-white">Сбросить</button>
                      <button onClick={() => setPriceDropdownOpen(false)} className="flex-1 px-4 py-2.5 rounded text-sm font-medium text-white" style={{ backgroundColor: '#c97a3a' }}>Применить</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="catalog-found hidden sm:block ml-2">Найдено: <span className="catalog-found-count">{containers?.length || 0}</span></div>
            <div className="hidden sm:block flex-1" />
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400/60" />
              <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="catalog-search w-full sm:w-[200px] lg:w-[256px] text-sm sm:text-base" />
            </div>
            <div className="catalog-found sm:hidden text-center">Найдено: <span className="catalog-found-count">{containers?.length || 0}</span></div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 sm:py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
          ) : containers && containers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {containers.map((container) => (
                <ContainerCard key={container.id} id={container.id} externalId={container.externalId} name={`Контейнер ${container.name}`} size={container.size} condition={container.condition} price={container.price} mainPhoto={container.mainPhoto} terminalLocation={container.terminalLocation} />
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
