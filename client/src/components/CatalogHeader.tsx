import { Link } from "wouter";

interface CatalogHeaderProps {
  showBackButton?: boolean;
  backUrl?: string;
}

export default function CatalogHeader({ showBackButton, backUrl = "/catalog" }: CatalogHeaderProps) {
  return (
    <header className="catalog-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3 flex items-center justify-between h-20">
        {/* Logo - exact match from original */}
        <Link href="/catalog" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="h-10 sm:h-14 w-auto"
          />
          <div className="flex items-baseline flex-wrap">
            <span className="catalog-logo-text">Каталог</span>
            <span className="catalog-logo-text-bold ml-1">контейнеров</span>
            <span className="catalog-logo-365">365</span>
          </div>
        </Link>

        {/* Contact Info - exact match from original */}
        <div className="flex items-center gap-4 sm:gap-6">
          <a 
            href="tel:+79999999999" 
            className="catalog-contact hidden sm:block"
          >
            +7 (999) 999-99-99
          </a>
          <a 
            href="https://wa.me/79999999999" 
            target="_blank" 
            rel="noopener noreferrer"
            className="catalog-contact catalog-whatsapp"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </header>
  );
}
