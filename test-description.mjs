import * as cheerio from 'cheerio';
import fs from 'fs';

const fileContent = fs.readFileSync('/home/ubuntu/upload/export(5).xls', 'utf-8');
const $ = cheerio.load(fileContent);

const normalizeColumnName = (name) => {
  return name.toLowerCase().replace(/[\s\/\-_]/g, '');
};

const columnPatterns = {
  product: ['товар', 'название', 'наименование', 'id', 'product', 'name'],
  photos: ['картинки', 'галерея', 'фото', 'картинкигалереи', 'photos', 'gallery', 'images'],
  price: ['цена', 'розничнаяцена', 'стоимость', 'price', 'retailprice'],
  size: ['тип', 'типконтейнера', 'размер', 'type', 'containertype', 'size'],
  condition: ['класс', 'состояние', 'качество', 'класссостояние', 'condition', 'quality', 'класскачества'],
  description: ['описание', 'детальноеописание', 'description', 'detaileddescription'],
};

let columnIndices = {};

$('table tr').each((i, row) => {
  if (i === 0) {
    // Parse header row
    const headerCells = $(row).find('td, th');
    console.log('=== HEADERS ===');
    headerCells.each((colIndex, cell) => {
      const headerText = normalizeColumnName($(cell).text());
      console.log(`Column ${colIndex}: "${$(cell).text()}" -> normalized: "${headerText}"`);
      
      // Match header to column type
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
  
  if (i === 1) {
    // First data row
    const cells = $(row).find('td');
    console.log('\n=== FIRST DATA ROW ===');
    console.log(`Total cells: ${cells.length}`);
    
    const productName = columnIndices.product !== undefined ? $(cells[columnIndices.product]).text().trim() : '';
    console.log(`Product: "${productName}"`);
    
    const description = columnIndices.description !== undefined ? $(cells[columnIndices.description]).text().trim() : '';
    console.log(`Description (index ${columnIndices.description}): "${description}"`);
    console.log(`Description length: ${description.length}`);
    console.log(`Description HTML: ${$(cells[columnIndices.description]).html()}`);
  }
});
