import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Search, Phone, FileText } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900">Каталог контейнеров</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Морские контейнеры для перевозки грузов</span>
              <Link href="/admin/login">
                <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
                  Вход
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12">
        {/* Hero Card */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">Каталог контейнеров</CardTitle>
                <CardDescription>Просмотрите доступные контейнеры</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-6">
              Откройте полный каталог морских контейнеров с фильтрацией по типу и качеству. 
              Просмотрите детальную информацию о каждом контейнере, включая фотографии и цены.
            </p>
            <Link href="/catalog">
              <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                Перейти в каталог
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Как использовать каталог</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <p className="text-gray-700">
                    Перейдите в раздел <strong>Каталог контейнеров</strong> для просмотра всех доступных контейнеров
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <p className="text-gray-700">
                    Используйте фильтры для поиска контейнеров по типу (10 фут, 20 фут, 40 фут) и качеству (Новый, Б/У)
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <p className="text-gray-700">
                    Нажмите на контейнер для просмотра полной информации, включая фотографии и характеристики
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <p className="text-gray-700">
                    Используйте кнопку "Запросить информацию" для связи с нами по поводу интересующего контейнера
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
