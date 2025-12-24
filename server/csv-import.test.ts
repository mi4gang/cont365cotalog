import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Test CSV parsing logic
describe("CSV Import", () => {
  // Helper function to parse CSV (same logic as frontend)
  const parseCSV = (text: string) => {
    const cleanText = text.replace(/^\uFEFF/, "");
    const lines = cleanText.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error("CSV файл должен содержать заголовок и хотя бы одну строку данных");
    }

    const header = lines[0].split(";").map((h) => h.trim().toLowerCase());
    
    const idIndex = header.findIndex((h) => h.includes("id") || h.includes("ид"));
    const nameIndex = header.findIndex((h) => h.includes("name") || h.includes("название") || h.includes("имя"));
    const sizeIndex = header.findIndex((h) => h.includes("size") || h.includes("размер") || h.includes("тип"));
    const conditionIndex = header.findIndex((h) => h.includes("condition") || h.includes("состояние") || h.includes("качеств") || h.includes("класс"));
    const priceIndex = header.findIndex((h) => h.includes("price") || h.includes("цена") || h.includes("стоимость"));
    
    const photoIndex = header.findIndex((h) => 
      h.includes("photo") || h.includes("фото") || h.includes("image") || h.includes("url") || h.includes("ссылка")
    );

    if (idIndex === -1) {
      throw new Error("Не найден столбец ID в CSV файле");
    }

    const result: Array<{
      externalId: string;
      name: string;
      size: string;
      condition: "new" | "used";
      price?: string;
      photoUrls: string[];
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(";").map((v) => v.trim());
      
      const externalId = values[idIndex];
      if (!externalId) continue;

      const name = nameIndex !== -1 ? values[nameIndex] : `Контейнер ${externalId}`;
      const size = sizeIndex !== -1 ? values[sizeIndex] : "20 фут";
      const conditionRaw = conditionIndex !== -1 ? values[conditionIndex]?.toLowerCase() : "used";
      const condition: "new" | "used" = 
        conditionRaw?.includes("нов") || conditionRaw === "new" ? "new" : "used";
      
      let price: string | undefined;
      if (priceIndex !== -1 && values[priceIndex]) {
        const priceStr = values[priceIndex]
          .replace(/\s/g, "")
          .replace(/₽/g, "")
          .replace(/,/g, ".");
        const priceNum = parseFloat(priceStr);
        if (!isNaN(priceNum)) {
          price = priceNum.toString();
        }
      }

      const photoUrls: string[] = [];
      if (photoIndex !== -1 && values[photoIndex]) {
        const photoCell = values[photoIndex];
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

  it("parses CSV with Russian headers correctly", () => {
    // Note: The CSV format has columns: ID;Name;Photo;Price;Type;Quality
    // Quality column (Класс качества) determines condition
    // The header has trailing spaces after some columns which we need to handle
    const csvContent = `ID;Название;Фото;Рекомендованная цена продажи;Тип контейнера;Класс качества
FONU11320953;Контейнер #19;https://example.com/photo1.png, https://example.com/photo2.png;70 000.00 ₽;10 фут;Б/У
FONU1720953;Контейнер #1;https://example.com/photo3.png;100 000.00 ₽;20 фут 2.6;Новый`;

    const result = parseCSV(csvContent);

    expect(result).toHaveLength(2);
    
    // First container
    expect(result[0].externalId).toBe("FONU11320953");
    expect(result[0].name).toBe("Контейнер #19");
    expect(result[0].size).toBe("10 фут");
    expect(result[0].condition).toBe("used");
    expect(result[0].price).toBe("70000");
    expect(result[0].photoUrls).toHaveLength(2);
    expect(result[0].photoUrls[0]).toBe("https://example.com/photo1.png");
    expect(result[0].photoUrls[1]).toBe("https://example.com/photo2.png");

    // Second container
    expect(result[1].externalId).toBe("FONU1720953");
    expect(result[1].name).toBe("Контейнер #1");
    expect(result[1].size).toBe("20 фут 2.6");
    expect(result[1].condition).toBe("new");
    expect(result[1].price).toBe("100000");
    expect(result[1].photoUrls).toHaveLength(1);
  });

  it("handles BOM in CSV file", () => {
    const csvWithBom = `\uFEFFID ;Название;Фото ;Рекомендованная цена продажи ;Тип контейнера ;Класс качества 
123;Test Container;https://example.com/photo.png;50 000.00 ₽;20 фут;Новый`;

    const result = parseCSV(csvWithBom);
    
    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe("123");
  });

  it("parses multiple photos separated by comma and space", () => {
    const csv = `ID;Название;Фото;Цена;Тип;Качество
TEST1;Test;https://a.com/1.png, https://b.com/2.png, https://c.com/3.png, https://d.com/4.png, https://e.com/5.png, https://f.com/6.png;10000;20 фут;Новый`;

    const result = parseCSV(csv);
    
    expect(result[0].photoUrls).toHaveLength(6);
    expect(result[0].photoUrls[0]).toBe("https://a.com/1.png");
    expect(result[0].photoUrls[5]).toBe("https://f.com/6.png");
  });

  it("correctly identifies condition from Russian text", () => {
    const csv = `ID;Название;Фото;Цена;Тип;Качество
1;Container 1;;10000;20 фут;Новый
2;Container 2;;10000;20 фут;Б/У
3;Container 3;;10000;20 фут;новый
4;Container 4;;10000;20 фут;б/у`;

    const result = parseCSV(csv);
    
    expect(result[0].condition).toBe("new");
    expect(result[1].condition).toBe("used");
    expect(result[2].condition).toBe("new");
    expect(result[3].condition).toBe("used");
  });

  it("parses price with spaces and currency symbol", () => {
    const csv = `ID;Название;Фото;Рекомендованная цена продажи;Тип;Качество
1;Test1;;70 000.00 ₽;20 фут;Новый
2;Test2;;100000;20 фут;Новый
3;Test3;;85 000.00;20 фут;Новый`;

    const result = parseCSV(csv);
    
    expect(result[0].price).toBe("70000");
    expect(result[1].price).toBe("100000");
    expect(result[2].price).toBe("85000");
  });

  it("throws error when ID column is missing", () => {
    const csv = `Название;Фото;Цена
Test;https://example.com/photo.png;10000`;

    expect(() => parseCSV(csv)).toThrow("Не найден столбец ID в CSV файле");
  });

  it("throws error for empty CSV", () => {
    const csv = `ID;Название;Фото`;

    expect(() => parseCSV(csv)).toThrow("CSV файл должен содержать заголовок и хотя бы одну строку данных");
  });

  it("skips rows with empty ID", () => {
    const csv = `ID;Название;Фото;Цена;Тип;Качество
1;Container 1;;10000;20 фут;Новый
;Empty ID;;10000;20 фут;Новый
3;Container 3;;10000;20 фут;Новый`;

    const result = parseCSV(csv);
    
    expect(result).toHaveLength(2);
    expect(result[0].externalId).toBe("1");
    expect(result[1].externalId).toBe("3");
  });
});
