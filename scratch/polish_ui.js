const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      // Update background to a more elegant light blue (sky-50)
      if (content.includes('min-h-screen')) {
         const bgMatches = content.match(/bg-\[#f8fafc\]|bg-slate-50|bg-blue-50\/50/g);
         if (bgMatches) {
            content = content.replace(/bg-\[#f8fafc\]/g, 'bg-sky-50/50');
            content = content.replace(/bg-slate-50/g, 'bg-sky-50/50');
            content = content.replace(/bg-blue-50\/50/g, 'bg-sky-50/50');
            modified = true;
         }
      }
      
      // Darken sidebar fonts
      if (fullPath.includes('Sidebar.tsx')) {
         if (content.includes('text-slate-700')) {
            content = content.replace(/text-slate-700/g, 'text-slate-900');
            modified = true;
         }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log('Updated: ' + fullPath);
      }
    }
  }
}
replaceInDir('src');
