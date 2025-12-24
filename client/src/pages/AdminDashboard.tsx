import { useState, useRef } from "react";
import { useAdminAuth, useAdminLogout } from "@/hooks/useAdminAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Upload,
  Package,
  LogOut,
  FileText,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

interface ParsedContainer {
  externalId: string;
  name: string;
  size: string;
  condition: "new" | "used";
  price?: string;
  photoUrls: string[];
}

export default function AdminDashboard() {
  const { adminUser, isLoading: authLoading } = useAdminAuth();
  const logoutMutation = useAdminLogout();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [parsedData, setParsedData] = useState<ParsedContainer[]>([]);
  const [parseError, setParseError] = useState("");
  const [fileName, setFileName] = useState("");

  const { data: containers, refetch: refetchContainers } = trpc.adminContainers.list.useQuery();
  const { data: importHistory } = trpc.adminContainers.getImportHistory.useQuery();

  const importMutation = trpc.adminContainers.importCsv.useMutation({
    onSuccess: (result) => {
      toast.success(`Импорт завершен: добавлено ${result.added}, обновлено ${result.updated}`);
      setParsedData([]);
      setFileName("");
      refetchContainers();
    },
    onError: (err) => {
      toast.error(err.message || "Ошибка импорта");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError("");
    setParsedData([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        setParsedData(parsed);
        toast.success(`Распознано ${parsed.length} контейнеров`);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Ошибка парсинга CSV");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const parseCSV = (text: string): ParsedContainer[] => {
    // Remove BOM if present
    const cleanText = text.replace(/^\uFEFF/, "");
    const lines = cleanText.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error("CSV файл должен содержать заголовок и хотя бы одну строку данных");
    }

    // Parse header to find column indices
    const header = lines[0].split(";").map((h) => h.trim().toLowerCase());
    
    const idIndex = header.findIndex((h) => h.includes("id") || h.includes("ид"));
    const nameIndex = header.findIndex((h) => h.includes("name") || h.includes("название") || h.includes("имя"));
    const sizeIndex = header.findIndex((h) => h.includes("size") || h.includes("размер") || h.includes("тип"));
    const conditionIndex = header.findIndex((h) => h.includes("condition") || h.includes("состояние") || h.includes("качеств") || h.includes("класс"));
    const priceIndex = header.findIndex((h) => h.includes("price") || h.includes("цена") || h.includes("стоимость"));
    
    // Find photo column index
    const photoIndex = header.findIndex((h) => 
      h.includes("photo") || h.includes("фото") || h.includes("image") || h.includes("url") || h.includes("ссылка")
    );

    if (idIndex === -1) {
      throw new Error("Не найден столбец ID в CSV файле");
    }

    const result: ParsedContainer[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(";").map((v) => v.trim());
      
      const externalId = values[idIndex];
      if (!externalId) continue;

      const name = nameIndex !== -1 ? values[nameIndex] : `Контейнер ${externalId}`;
      const size = sizeIndex !== -1 ? values[sizeIndex] : "20 фут";
      const conditionRaw = conditionIndex !== -1 ? values[conditionIndex]?.toLowerCase() : "used";
      const condition: "new" | "used" = 
        conditionRaw?.includes("нов") || conditionRaw === "new" ? "new" : "used";
      
      // Parse price: remove spaces, currency symbol, convert to number format
      let price: string | undefined;
      if (priceIndex !== -1 && values[priceIndex]) {
        const priceStr = values[priceIndex]
          .replace(/\s/g, "")  // Remove all spaces
          .replace(/₽/g, "")   // Remove ruble symbol
          .replace(/,/g, "."); // Replace comma with dot
        const priceNum = parseFloat(priceStr);
        if (!isNaN(priceNum)) {
          price = priceNum.toString();
        }
      }

      // Parse photos: multiple URLs separated by ", " in one cell
      const photoUrls: string[] = [];
      if (photoIndex !== -1 && values[photoIndex]) {
        const photoCell = values[photoIndex];
        // Split by ", " (comma followed by space) to get individual URLs
        const urls = photoCell.split(", ").map(u => u.trim()).filter(u => u);
        for (const url of urls) {
          if (url.startsWith("http") || url.startsWith("//")) {
            photoUrls.push(url.startsWith("//") ? `https:${url}` : url);
          }
        }
      }

      result.push({
        externalId,
        name,
        size,
        condition,
        price,
        photoUrls,
      });
    }

    return result;
  };

  const handleImport = () => {
    if (parsedData.length === 0) {
      toast.error("Нет данных для импорта");
      return;
    }

    importMutation.mutate({
      data: parsedData,
      filename: fileName,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!adminUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">Админ-панель</h1>
              <span className="text-sm text-gray-500">
                {adminUser.name || adminUser.username}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/catalog">
                <Button variant="outline" size="sm">
                  <Package className="w-4 h-4 mr-2" />
                  Каталог
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.logout()}
                disabled={logoutMutation.isLoading}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выход
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <Tabs defaultValue="import" className="space-y-6">
          <TabsList>
            <TabsTrigger value="import">
              <Upload className="w-4 h-4 mr-2" />
              Импорт CSV
            </TabsTrigger>
            <TabsTrigger value="containers">
              <Package className="w-4 h-4 mr-2" />
              Контейнеры ({containers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history">
              <FileText className="w-4 h-4 mr-2" />
              История импорта
            </TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import">
            <Card>
              <CardHeader>
                <CardTitle>Импорт данных из CSV</CardTitle>
                <CardDescription>
                  Загрузите CSV файл с данными контейнеров. Формат: ID;Название;Размер;Состояние;Цена;Фото1;Фото2;...
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-2">
                    {fileName || "Выберите CSV файл для загрузки"}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Выбрать файл
                  </Button>
                </div>

                {/* Parse Error */}
                {parseError && (
                  <Alert variant="destructive">
                    <XCircle className="w-4 h-4" />
                    <AlertDescription>{parseError}</AlertDescription>
                  </Alert>
                )}

                {/* Parsed Data Preview */}
                {parsedData.length > 0 && (
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle className="w-4 h-4" />
                      <AlertDescription>
                        Распознано {parsedData.length} контейнеров. Проверьте данные и нажмите "Импортировать".
                      </AlertDescription>
                    </Alert>

                    <div className="max-h-[400px] overflow-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Название</TableHead>
                            <TableHead>Размер</TableHead>
                            <TableHead>Состояние</TableHead>
                            <TableHead>Цена</TableHead>
                            <TableHead>Фото</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedData.slice(0, 10).map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">{item.externalId}</TableCell>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{item.size}</TableCell>
                              <TableCell>
                                <span className={item.condition === "new" ? "text-green-600" : "text-gray-600"}>
                                  {item.condition === "new" ? "Новый" : "Б/У"}
                                </span>
                              </TableCell>
                              <TableCell>{item.price || "—"}</TableCell>
                              <TableCell>
                                <span className="flex items-center gap-1">
                                  <ImageIcon className="w-4 h-4" />
                                  {item.photoUrls.length}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {parsedData.length > 10 && (
                      <p className="text-sm text-gray-500 text-center">
                        Показано 10 из {parsedData.length} записей
                      </p>
                    )}

                    <div className="flex justify-end gap-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setParsedData([]);
                          setFileName("");
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                      >
                        Отмена
                      </Button>
                      <Button
                        onClick={handleImport}
                        disabled={importMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {importMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Импорт...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Импортировать
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Containers Tab */}
          <TabsContent value="containers">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Контейнеры в базе</CardTitle>
                    <CardDescription>
                      Управление контейнерами и их фотографиями
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchContainers()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Обновить
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {containers && containers.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Название</TableHead>
                          <TableHead>Размер</TableHead>
                          <TableHead>Состояние</TableHead>
                          <TableHead>Цена</TableHead>
                          <TableHead>Фото</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {containers.map((container) => (
                          <TableRow key={container.id}>
                            <TableCell className="font-mono text-sm">{container.externalId}</TableCell>
                            <TableCell>{container.name}</TableCell>
                            <TableCell>{container.size}</TableCell>
                            <TableCell>
                              <span className={container.condition === "new" ? "badge-new" : "badge-used"}>
                                {container.condition === "new" ? "Новый" : "Б/У"}
                              </span>
                            </TableCell>
                            <TableCell>{container.price || "—"}</TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1">
                                <ImageIcon className="w-4 h-4" />
                                {container.photos?.length || 0}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={container.isActive ? "text-green-600" : "text-red-600"}>
                                {container.isActive ? "Активен" : "Скрыт"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Link href={`/admin/container/${container.id}`}>
                                <Button variant="outline" size="sm">
                                  Редактировать
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Нет контейнеров в базе</p>
                    <p className="text-sm">Загрузите CSV файл для добавления контейнеров</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>История импорта</CardTitle>
                <CardDescription>
                  Журнал всех операций импорта данных
                </CardDescription>
              </CardHeader>
              <CardContent>
                {importHistory && importHistory.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Дата</TableHead>
                          <TableHead>Файл</TableHead>
                          <TableHead>Обработано</TableHead>
                          <TableHead>Добавлено</TableHead>
                          <TableHead>Обновлено</TableHead>
                          <TableHead>Статус</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importHistory.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              {new Date(record.createdAt).toLocaleString("ru-RU")}
                            </TableCell>
                            <TableCell>{record.filename || "—"}</TableCell>
                            <TableCell>{record.containersProcessed}</TableCell>
                            <TableCell className="text-green-600">+{record.containersAdded}</TableCell>
                            <TableCell className="text-blue-600">{record.containersUpdated}</TableCell>
                            <TableCell>
                              <span className={
                                record.status === "completed" ? "text-green-600" :
                                record.status === "failed" ? "text-red-600" :
                                "text-yellow-600"
                              }>
                                {record.status === "completed" ? "Завершен" :
                                 record.status === "failed" ? "Ошибка" :
                                 record.status === "processing" ? "В процессе" : "Ожидание"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>История импорта пуста</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
