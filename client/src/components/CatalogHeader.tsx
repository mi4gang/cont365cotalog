import { Link } from "wouter";
import { Phone, MessageCircle } from "lucide-react";

interface CatalogHeaderProps {
  showBackButton?: boolean;
  backUrl?: string;
}

export default function CatalogHeader({ showBackButton, backUrl = "/catalog" }: CatalogHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-[var(--catalog-bg)] border-b border-white/10">
      <div className="container py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 flex items-center justify-center">
              <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                <rect x="2" y="8" width="36" height="24" rx="2" stroke="currentColor" strokeWidth="2" className="text-blue-500"/>
                <line x1="8" y1="8" x2="8" y2="32" stroke="currentColor" strokeWidth="2" className="text-blue-500"/>
                <line x1="14" y1="8" x2="14" y2="32" stroke="currentColor" strokeWidth="2" className="text-blue-500"/>
                <line x1="20" y1="8" x2="20" y2="32" stroke="currentColor" strokeWidth="2" className="text-blue-500"/>
                <line x1="26" y1="8" x2="26" y2="32" stroke="currentColor" strokeWidth="2" className="text-blue-500"/>
                <line x1="32" y1="8" x2="32" y2="32" stroke="currentColor" strokeWidth="2" className="text-blue-500"/>
              </svg>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-white">Каталог</span>
              <span className="text-xl font-bold text-blue-500">контейнеров</span>
              <span className="text-xl font-bold text-[var(--catalog-price)]">365</span>
            </div>
          </Link>

          {/* Contact Info */}
          <div className="flex items-center gap-4">
            <a 
              href="tel:+79999999999" 
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">+7 (999) 999-99-99</span>
            </a>
            <a 
              href="https://wa.me/79999999999" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
