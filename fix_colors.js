const fs = require('fs');
const path = require('path');

// NUEVA PALETA DE COLORES "PREMIUM DESSERT"
const OLD_DARK = '#3E2723';
const OLD_LIGHT = '#F5F1E9';

const NEW_DARK = '#4A3B32'; // Chocolate
const NEW_LIGHT = '#FAF7F2'; // Vainilla
const NEW_ACCENT = '#D4A373'; // Caramel
const NEW_MUTED = '#8C7A6B'; // Cacao suave

const directoriesToScan = ['./app', './components'];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (fullPath.endsWith('.js') || fullPath.endsWith('.tsx') || fullPath.endsWith('.css')) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

function fixColorsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. REEMPLAZO BÁSICO DE PALETA
  // Reemplazamos los códigos hexadecimales antiguos por los nuevos.
  // Usamos un reemplazo global case-insensitive.
  content = content.replace(new RegExp(OLD_DARK, 'gi'), NEW_DARK);
  content = content.replace(new RegExp(OLD_LIGHT, 'gi'), NEW_LIGHT);

  // 2. CORRECCIÓN INTELIGENTE DE CONTRASTES (BOTONES INVISIBLES)
  // Problema: bg-[#4A3B32]/5 text-[#FAF7F2]/70 -> Fondo casi blanco, texto casi blanco.
  // Solución: Si el fondo es Dark pero con opacidad baja (/5, /10, /20), el texto debe ser oscuro.
  
  // RegEx que busca "bg-[NEW_DARK]/[baja_opacidad] ... text-[NEW_LIGHT]"
  // y cambia el text a NEW_DARK.
  // Ejemplo: bg-[#4A3B32]/5 hover:bg-[#4A3B32]/10 text-[#FAF7F2]/70
  
  const badContrastRegex = new RegExp(`bg-\\[${NEW_DARK}\\]\\/(5|10|20)(.*?)text-\\[${NEW_LIGHT}\\](\\/\\d+)?`, 'g');
  content = content.replace(badContrastRegex, `bg-[${NEW_DARK}]/$1$2text-[${NEW_DARK}]$3`);

  // También si el fondo es claro y el texto es claro (algo raro pero posible)
  const badContrastRegex2 = new RegExp(`bg-\\[${NEW_LIGHT}\\](.*?\\s)text-\\[${NEW_LIGHT}\\](\\/\\d+)?`, 'g');
  content = content.replace(badContrastRegex2, `bg-[${NEW_LIGHT}]$1text-[${NEW_DARK}]$2`);

  // 3. MEJORA VISUAL DE BOTONES PRIMARIOS
  // Reemplazamos algunos bg-[NEW_DARK] con texto claro por botones acentuados
  // No lo haremos globalmente, solo en botones importantes que podamos identificar,
  // pero por ahora el contraste nativo será seguro con Chocolate y Vainilla.

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[+] Corregido: ${filePath}`);
  }
}

let allFiles = [];
directoriesToScan.forEach(dir => {
  if (fs.existsSync(dir)) {
    allFiles = getAllFiles(dir, allFiles);
  }
});

console.log('Iniciando corrección de Paleta y Contrastes (Gusto V2)...');
allFiles.forEach(file => {
  fixColorsInFile(file);
});
console.log('¡Proceso completado exitosamente!');
