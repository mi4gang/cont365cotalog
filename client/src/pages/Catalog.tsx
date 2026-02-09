import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import CatalogHeader from "@/components/CatalogHeader";
import ContainerCard from "@/components/ContainerCard";
import { Search, Loader2, ChevronDown } from "lucide-react";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

export default function Catalog() {
  const [sizeFilters, setSizeFilters] = useState<string[]>([]);
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [terminalFilters, setTerminalFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [conditionDropdownOpen, setConditionDropdownOpen] = useState(false);
  const [terminalDropdownOpen, setTerminalDropdownOpen] = useState(false);
  const [priceDropdownOpen, setPriceDropdownOpen] = useState(false);
  const [priceFrom, setPriceFrom] = useState<string>("");
  const [priceTo, setPriceTo] = useState<string>("");
  const [sliderValues, setSliderValues] = useState<[number, number]>([0, 1000000]);
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sliderInitialized, setSliderInitialized] = useState(false);
  
  // Debounced price values for query (to prevent flickering)
  const [debouncedPriceFrom, setDebouncedPriceFrom] = useState<string>("");
  const [debouncedPriceTo, setDebouncedPriceTo] = useState<string>("");
  
  const sizeDropdownRef = useRef<HTMLDivElement>(null);
  const conditionDropdownRef = useRef<HTMLDivElement>(null);
  const terminalDropdownRef = useRef<HTMLDivElement>(null);
  const priceDropdownRef = useRef<HTMLDivElement>(null);
  const priceMobileAccordionRef = useRef<HTMLDivElement>(null);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load filters from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Helper to decode parameter safely
    const getDecodedParam = (key: string) => {
      let val = params.get(key);
      if (!val) return null;
      
      // Attempt to decode multiple times in case of double/triple encoding
      // but limit to 3 times to prevent infinite loops or over-decoding
      let decoded = val;
      let iterations = 0;
      while (iterations < 3) {
        try {
          const nextDecoded = decodeURIComponent(decoded);
          if (nextDecoded === decoded) break;
          decoded = nextDecoded;
          iterations++;
        } catch (e) {
          break;
        }
      }
      return decoded;
    };

    const urlSizes = getDecodedParam("sizes");
    const urlCondition = getDecodedParam("condition");
    const urlTerminals = getDecodedParam("terminals");
    const urlPriceFrom = getDecodedParam("priceFrom");
    const urlPriceTo = getDecodedParam("priceTo");
    const urlSearch = getDecodedParam("search");

    if (urlSizes) {
      // Filter out empty strings and duplicates
      const sizes = Array.from(new Set(urlSizes.split(",").filter(Boolean)));
      setSizeFilters(sizes);
    }
    if (urlCondition) setConditionFilter(urlCondition);
    if (urlTerminals) {
      const terminals = Array.from(new Set(urlTerminals.split(",").filter(Boolean)));
      setTerminalFilters(terminals);
    }
    if (urlPriceFrom) {
      setPriceFrom(urlPriceFrom);
      const numValue = parseFloat(urlPriceFrom);
      if (!isNaN(numValue)) {
        setSliderValues(prev => [numValue, prev[1]]);
      }
    }
    if (urlPriceTo) {
      setPriceTo(urlPriceTo);
      const numValue = parseFloat(urlPriceTo);
      if (!isNaN(numValue)) {
        setSliderValues(prev => [prev[0], numValue]);
      }
    }
    if (urlSearch) setSearchQuery(urlSearch);
    
    // Mark as initialized after setting all filters
    setIsInitialized(true);
  }, []); // Run only on mount

  // Sync filters to URL (only after initialization)
  useEffect(() => {
    // Don't update URL until filters are loaded from URL
    if (!isInitialized) return;
    
    const params = new URLSearchParams();
    if (sizeFilters.length > 0) params.set("sizes", sizeFilters.join(","));
    if (conditionFilter !== "all") params.set("condition", conditionFilter);
    if (terminalFilters.length > 0) params.set("terminals", terminalFilters.join(","));
    if (priceFrom) params.set("priceFrom", priceFrom);
    if (priceTo) params.set("priceTo", priceTo);
    if (searchQuery) params.set("search", searchQuery);
    
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;
    
    // Only update if URL actually changed to avoid redundant history entries
    if (window.location.search !== (queryString ? `?${queryString}` : "")) {
      window.history.replaceState({}, "", newUrl);
    }
  }, [sizeFilters, conditionFilter, terminalFilters, priceFrom, priceTo, searchQuery, isInitialized]);

  // Debounce price values to prevent flickering on slider movement
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPriceFrom(priceFrom);
      setDebouncedPriceTo(priceTo);
    }, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [priceFrom, priceTo]);

  // Query for displayed containers (with all filters including price)
  const { data: containers, isLoading } = trpc.containers.list.useQuery({
    sizes: sizeFilters.length > 0 ? sizeFilters : undefined,
    condition: conditionFilter !== "all" ? (conditionFilter as "new" | "used") : undefined,
    terminals: terminalFilters.length > 0 ? terminalFilters : undefined,
    search: searchQuery || undefined,
    priceFrom: debouncedPriceFrom ? parseFloat(debouncedPriceFrom) : undefined,
    priceTo: debouncedPriceTo ? parseFloat(debouncedPriceTo) : undefined,
  });

  // Separate query for price range calculation (WITHOUT price filter)
  const { data: containersForPriceRange } = trpc.containers.list.useQuery({
    sizes: sizeFilters.length > 0 ? sizeFilters : undefined,
    condition: conditionFilter !== "all" ? (conditionFilter as "new" | "used") : undefined,
    terminals: terminalFilters.length > 0 ? terminalFilters : undefined,
    search: searchQuery || undefined,
    // NO priceFrom/priceTo here!
  });

  const { data: sizes } = trpc.containers.getSizes.useQuery();
  const { data: terminals } = trpc.containers.getTerminals.useQuery();

  // Calculate price range from containers WITHOUT price filter
  const priceRange = useMemo(() => {
    if (!containersForPriceRange || containersForPriceRange.length === 0) return { min: 0, max: 1000000 };
    const prices = containersForPriceRange.map(c => parseFloat(c.price || "0")).filter(p => p > 0);
    if (prices.length === 0) return { min: 0, max: 1000000 };
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return {
      min: Math.floor(minPrice / 1000) * 1000,
      max: maxPrice // Use exact max price, don't round up
    };
  }, [containersForPriceRange]);

  // Initialize slider values when price range changes (only once)
  useEffect(() => {
    // Only update slider range if not initialized from URL and not yet initialized
    if (containersForPriceRange && containersForPriceRange.length > 0 && !isInitialized && !sliderInitialized) {
      setSliderValues([priceRange.min, priceRange.max]);
      setSliderInitialized(true);
    }
  }, [priceRange, containersForPriceRange, isInitialized, sliderInitialized]);

  const handleSliderChange = (values: number | number[]) => {
    if (Array.isArray(values)) {
      setSliderValues(values as [number, number]);
      setPriceFrom(values[0].toString());
      setPriceTo(values[1].toString());
    }
  };

  const handleInputChange = (type: 'from' | 'to', value: string) => {
    if (type === 'from') {
      setPriceFrom(value);
      const numValue = parseFloat(value) || priceRange.min;
      setSliderValues([numValue, sliderValues[1]]);
    } else {
      setPriceTo(value);
      const numValue = parseFloat(value) || priceRange.max;
      setSliderValues([sliderValues[0], numValue]);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(event.target as Node)) {
        setSizeDropdownOpen(false);
      }
      if (conditionDropdownRef.current && !conditionDropdownRef.current.contains(event.target as Node)) {
        setConditionDropdownOpen(false);
      }
      if (terminalDropdownRef.current && !terminalDropdownRef.current.contains(event.target as Node)) {
        setTerminalDropdownOpen(false);
      }
      if (priceDropdownRef.current && !priceDropdownRef.current.contains(event.target as Node)) {
        // Also check if click is inside mobile accordion
        if (priceMobileAccordionRef.current && priceMobileAccordionRef.current.contains(event.target as Node)) {
          return; // Don't close if clicking inside mobile accordion
        }
        setPriceDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getSizeLabel = () => {
    if (sizeFilters.length === 0) return "Размер";
    if (sizeFilters.length === 1) return sizeFilters[0];
    return `Размер (${sizeFilters.length})`;
  };

  const getConditionLabel = () => {
    if (conditionFilter === "all") return "Состояние";
    if (conditionFilter === "new") return "Новый";
    return "Б/У";
  };

  const handleSizeSelect = (size: string) => {
    setSizeFilters(prev => {
      if (prev.includes(size)) {
        // Remove if already selected
        return prev.filter(s => s !== size);
      } else {
        // Add if not selected
        return [...prev, size];
      }
    });
    // Keep dropdown open for multiple selection
  };

  const handleConditionSelect = (condition: string) => {
    setConditionFilter(condition);
    setConditionDropdownOpen(false);
  };

  const getTerminalLabel = () => {
    if (terminalFilters.length === 0) return "Локация";
    if (terminalFilters.length === 1) return terminalFilters[0];
    return `Локация (${terminalFilters.length})`;
  };

  const handleTerminalSelect = (terminal: string) => {
    setTerminalFilters(prev => {
      if (prev.includes(terminal)) {
        // Remove if already selected
        return prev.filter(t => t !== terminal);
      } else {
        // Add if not selected
        return [...prev, terminal];
      }
    });
    // Keep dropdown open for multiple selection
  };

  const getPriceLabel = () => {
    // Always show "Цена" on mobile, full range on desktop
    const isMobile = window.innerWidth < 640;
    if (isMobile) return "Цена";
    // Desktop: show full range with currency symbol
    if (!priceFrom && !priceTo) return "Цена";
    if (priceFrom && priceTo) return `${parseInt(priceFrom).toLocaleString()}-${parseInt(priceTo).toLocaleString()} ₽`;
    if (priceFrom) return `от ${parseInt(priceFrom).toLocaleString()} ₽`;
    return `до ${parseInt(priceTo).toLocaleString()} ₽`;
  };

  const handlePriceReset = () => {
    setPriceFrom("");
    setPriceTo("");
    setSliderValues([priceRange.min, priceRange.max]);
  };

  return (
    <div className="catalog-page min-h-screen">
      {/* Fixed background image - does NOT move on scroll */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1,
          overflow: 'hidden'
        }}
      >
        <img 
          src="/container-terminal-bg.jpg" 
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
            opacity: 0.5
          }}
        />
      </div>
      {/* Color overlay removed - image is already pre-blurred */}
      <CatalogHeader />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Glassmorphism Container for entire catalog */}
        <div 
          className="catalog-glass-container p-3 sm:p-6"
          style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
          }}
        >
          {/* Filters Row - responsive layout */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            {/* First filter row: Size and Condition */}
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Size Filter Dropdown */}
              <div className="relative flex-1 sm:flex-none" ref={sizeDropdownRef}>
                <button
                  className="catalog-filter-btn w-full sm:w-auto min-w-0 sm:min-w-[140px]"
                  onClick={() => {
                    setSizeDropdownOpen(!sizeDropdownOpen);
                    setConditionDropdownOpen(false);
                    setTerminalDropdownOpen(false);
                    setPriceDropdownOpen(false);
                  }}
                >
                  <span className="truncate text-sm sm:text-base">{getSizeLabel()}</span>
                  <ChevronDown className={`w-4 h-4 opacity-60 transition-transform flex-shrink-0 ${sizeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {sizeDropdownOpen && (
                  <div className="catalog-filter-dropdown absolute top-full left-0 mt-1 z-50 w-full sm:w-auto">
                    {sizes?.map((size) => (
                      <div
                        key={size}
                        className={`catalog-filter-option ${sizeFilters.includes(size) ? "selected" : ""}`}
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
                    setTerminalDropdownOpen(false);
                    setPriceDropdownOpen(false);
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

            {/* Second filter row: Terminal and Price */}
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Terminal Filter Dropdown */}
              <div className="relative flex-1 sm:flex-none" ref={terminalDropdownRef}>
                <button
                  className="catalog-filter-btn w-full sm:w-auto min-w-0 sm:min-w-[140px]"
                  onClick={() => {
                    setTerminalDropdownOpen(!terminalDropdownOpen);
                    setSizeDropdownOpen(false);
                    setConditionDropdownOpen(false);
                    setPriceDropdownOpen(false);
                  }}
                >
                  <span className="truncate text-sm sm:text-base">{getTerminalLabel()}</span>
                  <ChevronDown className={`w-4 h-4 opacity-60 transition-transform flex-shrink-0 ${terminalDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {terminalDropdownOpen && (
                  <div className="catalog-filter-dropdown absolute top-full left-0 mt-1 z-50 w-full sm:w-auto">
                    {terminals?.map((terminal) => (
                      <div
                        key={terminal}
                        className={`catalog-filter-option ${terminalFilters.includes(terminal) ? "selected" : ""}`}
                        onClick={() => handleTerminalSelect(terminal)}
                      >
                        {terminal}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Price Filter Dropdown */}
              <div className="relative flex-1 sm:flex-none" ref={priceDropdownRef}>
                <button
                  className="catalog-filter-btn w-full sm:w-auto min-w-0 sm:min-w-[140px]"
                  onClick={() => {
                    setPriceDropdownOpen(!priceDropdownOpen);
                    setSizeDropdownOpen(false);
                    setConditionDropdownOpen(false);
                    setTerminalDropdownOpen(false);
                  }}
                >
                  <span className="truncate text-sm sm:text-base">{getPriceLabel()}</span>
                  <ChevronDown className={`w-4 h-4 opacity-60 transition-transform flex-shrink-0 ${priceDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {/* Desktop: dropdown */}
                {priceDropdownOpen && !isMobile && (
                  <div className="catalog-filter-dropdown absolute top-full mt-1 z-50 w-80 p-5 left-0">
                    <div className="space-y-4">
                      {/* Range Slider */}
                      <div className="px-1">
                        <Slider
                          range
                          min={priceRange.min}
                          max={priceRange.max}
                          step={100}
                          value={sliderValues}
                          onChange={handleSliderChange}
                          styles={{
                            track: { backgroundColor: '#c97a3a', height: 6 },
                            rail: { backgroundColor: '#334155', height: 6 },
                            handle: {
                              backgroundColor: '#c97a3a',
                              borderColor: '#c97a3a',
                              width: 20,
                              height: 20,
                              marginTop: -7,
                              opacity: 1,
                              boxShadow: '0 2px 8px rgba(201, 122, 58, 0.4)'
                            }
                          }}
                        />
                      </div>
                      
                      {/* Input Fields */}
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-slate-300 mb-1.5 block">От</label>
                          <input
                            type="number"
                            placeholder={priceRange.min.toLocaleString()}
                            value={priceFrom}
                            onChange={(e) => handleInputChange('from', e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/30 rounded text-sm text-white placeholder:text-slate-500 focus:outline-none"
                            style={{ '--focus-border': 'rgba(201, 122, 58, 0.5)', '--focus-ring': 'rgba(201, 122, 58, 0.2)' } as React.CSSProperties}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(201, 122, 58, 0.5)';
                              e.currentTarget.style.boxShadow = '0 0 0 1px rgba(201, 122, 58, 0.2)';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.3)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-slate-300 mb-1.5 block">До</label>
                          <input
                            type="number"
                            placeholder={priceRange.max.toLocaleString()}
                            value={priceTo}
                            onChange={(e) => handleInputChange('to', e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/30 rounded text-sm text-white placeholder:text-slate-500 focus:outline-none"
                            style={{ '--focus-border': 'rgba(201, 122, 58, 0.5)', '--focus-ring': 'rgba(201, 122, 58, 0.2)' } as React.CSSProperties}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(201, 122, 58, 0.5)';
                              e.currentTarget.style.boxShadow = '0 0 0 1px rgba(201, 122, 58, 0.2)';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.3)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handlePriceReset}
                          className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 rounded text-sm font-medium text-white transition-colors"
                        >
                          Сбросить
                        </button>
                        <button
                          onClick={() => setPriceDropdownOpen(false)}
                          className="flex-1 px-4 py-2.5 rounded text-sm font-medium text-white transition-colors"
                          style={{ backgroundColor: '#c97a3a' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b86d34'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#c97a3a'}
                        >
                          Применить
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile: accordion price filter */}
            <>
            {priceDropdownOpen && isMobile && (
              <div className="w-full" ref={priceMobileAccordionRef}>
                <div className="catalog-filter-dropdown p-4">
                  <div className="space-y-4">
                    {/* Range Slider */}
                    <div className="px-1">
                      <Slider
                        range
                        min={priceRange.min}
                        max={priceRange.max}
                        step={100}
                        value={sliderValues}
                        onChange={handleSliderChange}
                        styles={{
                          track: { backgroundColor: '#c97a3a', height: 6 },
                          rail: { backgroundColor: '#334155', height: 6 },
                          handle: {
                            backgroundColor: '#c97a3a',
                            borderColor: '#c97a3a',
                            width: 20,
                            height: 20,
                            marginTop: -7,
                            opacity: 1,
                            boxShadow: '0 2px 8px rgba(201, 122, 58, 0.4)'
                          }
                        }}
                      />
                    </div>
                    
                    {/* Input Fields */}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-slate-300 mb-1.5 block">От</label>
                        <input
                          type="number"
                          placeholder={priceRange.min.toLocaleString()}
                          value={priceFrom}
                          onChange={(e) => handleInputChange('from', e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/30 rounded text-sm text-white placeholder:text-slate-500 focus:outline-none"
                          style={{ '--focus-border': 'rgba(201, 122, 58, 0.5)', '--focus-ring': 'rgba(201, 122, 58, 0.2)' } as React.CSSProperties}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(201, 122, 58, 0.5)';
                            e.currentTarget.style.boxShadow = '0 0 0 1px rgba(201, 122, 58, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.3)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-slate-300 mb-1.5 block">До</label>
                        <input
                          type="number"
                          placeholder={priceRange.max.toLocaleString()}
                          value={priceTo}
                          onChange={(e) => handleInputChange('to', e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/30 rounded text-sm text-white placeholder:text-slate-500 focus:outline-none"
                          style={{ '--focus-border': 'rgba(201, 122, 58, 0.5)', '--focus-ring': 'rgba(201, 122, 58, 0.2)' } as React.CSSProperties}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(201, 122, 58, 0.5)';
                            e.currentTarget.style.boxShadow = '0 0 0 1px rgba(201, 122, 58, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.3)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handlePriceReset}
                        className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 rounded text-sm font-medium text-white transition-colors"
                      >
                        Сбросить
                      </button>
                      <button
                        onClick={() => setPriceDropdownOpen(false)}
                        className="flex-1 px-4 py-2.5 rounded text-sm font-medium text-white transition-colors"
                        style={{ backgroundColor: '#c97a3a' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b86d34'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#c97a3a'}
                      >
                        Применить
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
            </>
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
                  terminalLocation={container.terminalLocation}
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
