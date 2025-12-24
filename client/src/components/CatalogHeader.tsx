import { Link } from "wouter";

interface CatalogHeaderProps {
  showBackButton?: boolean;
  backUrl?: string;
}

export default function CatalogHeader({ showBackButton, backUrl = "/catalog" }: CatalogHeaderProps) {
  return (
    <header className="catalog-header">
      <div className="container">
        <div className="flex items-center justify-between">
          {/* Logo - exact match from original */}
          <Link href="/catalog" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-14 w-auto"
              style={{ width: '84px', height: '56px' }}
            />
            <div className="flex items-baseline">
              <span className="catalog-logo-text">Каталог</span>
              <span className="catalog-logo-text-bold ml-2">контейнеров</span>
              <span className="catalog-logo-365">365</span>
            </div>
          </Link>

          {/* Contact Info - exact match from original */}
          <div className="flex items-center gap-6">
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
              className="catalog-contact catalog-whatsapp hidden sm:block"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
