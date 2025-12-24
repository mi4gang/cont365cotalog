import { useState } from "react";
import { trpc } from "@/lib/trpc";
import CatalogHeader from "@/components/CatalogHeader";
import ContainerCard from "@/components/ContainerCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2 } from "lucide-react";

export default function Catalog() {
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: containers, isLoading } = trpc.containers.list.useQuery({
    size: sizeFilter !== "all" ? sizeFilter : undefined,
    condition: conditionFilter !== "all" ? (conditionFilter as "new" | "used") : undefined,
    search: searchQuery || undefined,
  });

  const { data: sizes } = trpc.containers.getSizes.useQuery();

  return (
    <div className="catalog-theme">
      <CatalogHeader />

      <main className="container py-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Select value={sizeFilter} onValueChange={setSizeFilter}>
            <SelectTrigger className="w-[140px] bg-transparent border-white/20 text-white">
              <SelectValue placeholder="Размер" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все размеры</SelectItem>
              {sizes?.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={conditionFilter} onValueChange={setConditionFilter}>
            <SelectTrigger className="w-[140px] bg-transparent border-white/20 text-white">
              <SelectValue placeholder="Состояние" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="new">Новый</SelectItem>
              <SelectItem value="used">Б/У</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-white/60 text-sm">
            Найдено: <span className="text-white font-medium">{containers?.length || 0}</span>
          </div>

          <div className="flex-1" />

          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-[200px] bg-transparent border-white/20 text-white placeholder:text-white/40"
            />
          </div>
        </div>

        {/* Container Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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
            <div className="text-white/60 text-lg">Контейнеры не найдены</div>
            <p className="text-white/40 mt-2">Попробуйте изменить параметры поиска</p>
          </div>
        )}
      </main>
    </div>
  );
}
