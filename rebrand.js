const fs = require('fs');
const path = require('path');

const directories = [
  'c:/Gusto/app',
  'c:/Gusto/components'
];

const replacements = {
  // Fondos
  'bg-black': 'bg-[#F5F1E9]',
  'bg-gray-900': 'bg-white',
  'bg-gray-800': 'bg-[#3E2723]/5',
  'bg-gray-700': 'bg-[#3E2723]/10',
  
  // Bordes
  'border-gray-800': 'border-[#3E2723]/10',
  'border-gray-700': 'border-[#3E2723]/20',
  'border-gray-600': 'border-[#3E2723]/30',
  
  // Textos Generales
  'text-white': 'text-[#3E2723]',
  'text-gray-200': 'text-[#3E2723]/90',
  'text-gray-300': 'text-[#3E2723]/80',
  'text-gray-400': 'text-[#3E2723]/70',
  'text-gray-500': 'text-[#3E2723]/60',
  'text-gray-600': 'text-[#3E2723]/50',
  'text-gray-700': 'text-[#3E2723]/40',
  
  // Hover & Especiales
  'hover:text-white': 'hover:text-black',
  'hover:border-gray-600': 'hover:border-[#3E2723]/30',
  'hover:border-gray-500': 'hover:border-[#3E2723]/40',
  
  // Rebranding "Gusto" color primario en botones donde antes era rojo The red should be dark brown, except status badges red-500
  'bg-red-600': 'bg-[#3E2723]', // Botones primarios
  'hover:bg-red-700': 'hover:bg-black',
  'hover:bg-red-500': 'hover:bg-black',
  'text-red-600': 'text-[#3E2723]', // Títulos o íconos que eran rojos de la marca original
  'shadow-red-900/20': 'shadow-[#3E2723]/20'
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    // Ignorar layouts de texto
    if (fullPath.includes('layout.tsx') || fullPath.includes('globals.css')) {
      continue;
    }
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Realizar reemplazos basados en regex de palabra completa para que no se pisen.
  // Ej: \bbg-black\b
  for (const [key, value] of Object.entries(replacements)) {
    // Escapar clases como hover:bg-black
    const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(?<![a-zA-Z0-9_-])${escapedKey}(?![a-zA-Z0-9_-])`, 'g');
    content = content.replace(regex, value);
  }

  // ALGUNAS EXCEPCIONES:
  // Si algo es bg-[#3E2723] text-[#3E2723] se va a ver mal. 
  // Botones primarios ahora son bg-[#3E2723], su texto debería ser text-[#F5F1E9].
  // Como previamente el texto era text-white y lo pasamos a text-[#3E2723], arreglamos esto puntualmente:
  content = content.replace(/bg-\[#3E2723\](.*?)text-\[#3E2723\]/g, 'bg-[#3E2723]$1text-[#F5F1E9]');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Rebranded -> ${filePath}`);
  }
}

directories.forEach(processDirectory);
console.log('Rebranding Completo.');
