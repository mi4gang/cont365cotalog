import { Link } from "wouter";

interface CatalogHeaderProps {
  showBackButton?: boolean;
  backUrl?: string;
}

export default function CatalogHeader({ showBackButton, backUrl = "/catalog" }: CatalogHeaderProps) {
  return (
    <header className="relative z-50 bg-transparent">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
        {/* Mobile: stacked layout, Desktop: row layout */}
        <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-3 sm:gap-0">
          {/* Logo and Title */}
          <Link href="/catalog" className="flex items-center" style={{ gap: '0' }}>
            {/* Logo: responsive sizing */}
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-12 h-8 sm:w-[83.67px] sm:h-[56px]"
            />
            {/* Title container - responsive text */}
            <div className="flex items-baseline ml-2 sm:ml-3">
              <span 
                className="text-white text-xl sm:text-4xl"
                style={{ 
                  lineHeight: '1', 
                  fontWeight: 400, 
                  fontFamily: '"Noto Sans SC", sans-serif',
                  letterSpacing: '-0.5px'
                }}
              >
                Каталог
              </span>
              <span 
                className="text-white text-xl sm:text-4xl ml-1 sm:ml-2"
                style={{ 
                  lineHeight: '1', 
                  fontWeight: 700, 
                  fontFamily: '"Noto Sans SC", sans-serif',
                  letterSpacing: '-0.5px'
                }}
              >
                контейнеров
              </span>
              {/* 365 - responsive */}
              <span 
                className="text-xs sm:text-xl ml-1 sm:ml-1.5"
                style={{ 
                  lineHeight: '1', 
                  fontWeight: 700,
                  color: 'rgb(255, 140, 50)', 
                  fontFamily: '"Noto Sans SC", sans-serif'
                }}
              >
                365
              </span>
            </div>
          </Link>

          {/* Contact Info - responsive */}
          <div className="flex items-center gap-4 sm:gap-6">
            <a 
              href="tel:+79999999999" 
              className="transition-all hover:text-white text-sm sm:text-base"
              style={{ 
                color: 'rgb(200, 200, 200)',
                fontFamily: '"Noto Sans SC", sans-serif',
                fontWeight: 400,
                textDecoration: 'none',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              +7 (999) 999-99-99
            </a>
            <a 
              href="https://wa.me/79999999999" 
              target="_blank" 
              rel="noopener noreferrer"
              className="transition-all catalog-whatsapp-link text-sm sm:text-base"
              style={{ 
                color: 'rgb(200, 200, 200)',
                fontFamily: '"Noto Sans SC", sans-serif',
                fontWeight: 400,
                textDecoration: 'none',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              Telegram
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
