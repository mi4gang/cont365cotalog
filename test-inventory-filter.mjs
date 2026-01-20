import * as cheerio from 'cheerio';
import fs from 'fs';

const fileContent = fs.readFileSync('/home/ubuntu/upload/export(7).xls', 'utf-8');
const $ = cheerio.load(fileContent);

const normalizeColumnName = (name) => {
  return name.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\/-]/g, '')
    .trim();
};

const columnPatterns = {
  product: ['товар', 'название', 'наименование', 'id', 'product', 'name'],
  photos: ['картинки', 'галерея', 'фото', 'картинкигалереи', 'photos', 'gallery', 'images'],
  price: ['цена', 'розничнаяцена', 'стоимость', 'price', 'retailprice'],
  size: ['тип', 'типконтейнера', 'размер', 'type', 'containertype', 'size'],
  condition: ['класс', 'состояние', 'качество', 'класссостояние', 'condition', 'quality', 'класскачества'],
  description: ['описание', 'детальноеописание', 'description', 'detaileddescription'],
  inventory: ['доступныйостаток', 'остаток', 'наличие', 'доступность', 'inventory', 'stock', 'available'],
};

let columnIndices = {};

$('table tr').each((i, row) => {
  if (i === 0) {
    const headerCells = $(row).find('td, th');
    console.log('=== HEADERS ===');
    headerCells.each((colIndex, cell) => {
      const headerText = normalizeColumnName($(cell).text());
      console.log(`Column ${colIndex}: "${$(cell).text()}" -> normalized: "${headerText}"`);
      
      for (const [key, patterns] of Object.entries(columnPatterns)) {
        if (patterns.some(pattern => headerText.includes(pattern) || pattern.includes(headerText))) {
          columnIndices[key] = colIndex;
          console.log(`  -> Matched to: ${key}`);
          break;
        }
      }
    });
    console.log('\n=== COLUMN INDICES ===');
    console.log(columnIndices);
    return;
  }
  
  if (i >= 1 && i <= 5) {
    const cells = $(row).find('td');
    if (cells.length === 0) return;
    
    const productName = columnIndices.product !== undefined ? $(cells[columnIndices.product]).text().trim() : '';
    const inventoryText = columnIndices.inventory !== undefined ? $(cells[columnIndices.inventory]).text().trim() : '';
    const inventoryValue = parseInt(inventoryText) || 0;
    
    const shouldImport = columnIndices.inventory === undefined || inventoryValue === 1;
    
    console.log(`\nRow ${i}: ${productName}`);
    console.log(`  Inventory: "${inventoryText}" (value: ${inventoryValue})`);
    console.log(`  Should import: ${shouldImport ? 'YES' : 'NO (filtered out)'}`);
  }
});
