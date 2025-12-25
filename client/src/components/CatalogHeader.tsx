import { Link } from "wouter";

interface CatalogHeaderProps {
  showBackButton?: boolean;
  backUrl?: string;
}

export default function CatalogHeader({ showBackButton, backUrl = "/catalog" }: CatalogHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-transparent" style={{ height: '80px' }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 sm:gap-0 sm:h-20">
        {/* Logo - exact match from reference: 83.67px x 56px */}
        <div className="flex items-end" style={{ gap: '0' }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ width: '83.67px', height: '56px' }}
          />
          {/* Title container - exact spacing from reference */}
          <div className="flex items-end" style={{ marginLeft: '4.8px' }}>
            <span 
              className="text-white"
              style={{ 
                fontSize: '40px', 
                lineHeight: '40px', 
                fontWeight: 400, 
                fontFamily: '"Noto Sans SC", sans-serif',
                letterSpacing: '-0.5px'
              }}
            >
              Каталог
            </span>
            <span 
              className="text-white"
              style={{ 
                fontSize: '40px', 
                lineHeight: '40px', 
                fontWeight: 700, 
                marginLeft: '3.2px',
                fontFamily: '"Noto Sans SC", sans-serif',
                letterSpacing: '-0.5px'
              }}
            >
              контейнеров
            </span>
            {/* 365 - aligned to bottom of "контейнеров" baseline */}
            <span 
              style={{ 
                fontSize: '20.8px', 
                lineHeight: '20.8px', 
                fontWeight: 700,
                color: 'rgb(255, 140, 50)', 
                marginLeft: '0.8px',
                fontFamily: '"Noto Sans SC", sans-serif',
                alignSelf: 'flex-end',
                marginBottom: '0px'
              }}
            >
              365
            </span>
          </div>
        </div>

        {/* Contact Info - exact match from reference */}
        <div className="flex items-center gap-6">
          <a 
            href="tel:+79999999999" 
            className="transition-all hover:text-white"
            style={{ 
              color: 'rgb(200, 200, 200)',
              fontFamily: '"Noto Sans SC", sans-serif',
              fontSize: '16px',
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
            className="transition-all catalog-whatsapp-link"
            style={{ 
              color: 'rgb(200, 200, 200)',
              fontFamily: '"Noto Sans SC", sans-serif',
              fontSize: '16px',
              fontWeight: 400,
              textDecoration: 'none',
              transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            WhatsApp
          </a>
        </div>
      </div>
    </header>
  );
}
