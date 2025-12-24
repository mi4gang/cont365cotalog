import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ArrowLeft,
  Save,
  Star,
  Trash2,
  GripVertical,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminContainerEdit() {
  const params = useParams<{ id: string }>();
  const containerId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  
  useAdminAuth();

  const { data: container, isLoading, refetch } = trpc.containers.getById.useQuery(
    { id: containerId },
    { enabled: containerId > 0 }
  );

  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState<"new" | "used">("used");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (container) {
      setName(container.name);
      setSize(container.size);
      setCondition(container.condition);
      setPrice(container.price || "");
      setDescription(container.description || "");
      setIsActive(container.isActive);
    }
  }, [container]);

  const updateMutation = trpc.adminContainers.update.useMutation({
    onSuccess: () => {
      toast.success("Контейнер обновлен");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Ошибка обновления");
    },
  });

  const setMainPhotoMutation = trpc.adminContainers.setMainPhoto.useMutation({
    onSuccess: () => {
      toast.success("Главное фото установлено");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Ошибка");
    },
  });

  const deletePhotoMutation = trpc.adminContainers.deletePhoto.useMutation({
    onSuccess: () => {
      toast.success("Фото удалено");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Ошибка удаления");
    },
  });

  const reorderPhotosMutation = trpc.adminContainers.reorderPhotos.useMutation({
    onSuccess: () => {
      toast.success("Порядок фото обновлен");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Ошибка");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: containerId,
      name,
      size,
      condition,
      price: price || undefined,
      description: description || undefined,
      isActive,
    });
  };

  const handleSetMainPhoto = (photoId: number) => {
    setMainPhotoMutation.mutate({ containerId, photoId });
  };

  const handleDeletePhoto = (photoId: number) => {
    if (confirm("Удалить это фото?")) {
      deletePhotoMutation.mutate({ photoId });
    }
  };

  const handleMovePhoto = (photoId: number, direction: "up" | "down") => {
    if (!container?.photos) return;
    
    const photos = [...container.photos];
    const index = photos.findIndex(p => p.id === photoId);
    if (index === -1) return;
    
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= photos.length) return;
    
    [photos[index], photos[newIndex]] = [photos[newIndex], photos[index]];
    
    reorderPhotosMutation.mutate({
      containerId,
      photoIds: photos.map(p => p.id),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!container) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Контейнер не найден</h1>
          <Link href="/admin">
            <Button>Вернуться в админ-панель</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Редактирование контейнера</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Container Info */}
          <Card>
            <CardHeader>
              <CardTitle>Информация о контейнере</CardTitle>
              <CardDescription>ID: {container.externalId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Размер</Label>
                <Input
                  id="size"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Состояние</Label>
                <Select value={condition} onValueChange={(v) => setCondition(v as "new" | "used")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Новый</SelectItem>
                    <SelectItem value="used">Б/У</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Цена (₽)</Label>
                <Input
                  id="price"
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="100000.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Показывать в каталоге</Label>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Сохранить изменения
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Photos Management */}
          <Card>
            <CardHeader>
              <CardTitle>Фотографии</CardTitle>
              <CardDescription>
                Управление порядком и главным фото. Перетащите для изменения порядка.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {container.photos && container.photos.length > 0 ? (
                <div className="space-y-3">
                  {container.photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg ${
                        photo.isMain ? "border-yellow-400 bg-yellow-50" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleMovePhoto(photo.id, "up")}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleMovePhoto(photo.id, "down")}
                          disabled={index === container.photos!.length - 1}
                        >
                          ↓
                        </Button>
                      </div>

                      <div className="w-20 h-20 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={photo.url}
                          alt={`Фото ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          Фото #{photo.displayOrder}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {photo.url}
                        </p>
                        {photo.isMain && (
                          <span className="inline-flex items-center gap-1 text-xs text-yellow-600 mt-1">
                            <Star className="w-3 h-3 fill-current" />
                            Главное фото
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {!photo.isMain && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetMainPhoto(photo.id)}
                            disabled={setMainPhotoMutation.isPending}
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePhoto(photo.id)}
                          disabled={deletePhotoMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Нет фотографий</p>
                  <p className="text-sm">Фотографии добавляются через импорт CSV</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
