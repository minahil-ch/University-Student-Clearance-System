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
      
      if (content.includes('min-h-screen')) {
         if (content.includes('bg-[#f8fafc]')) {
            content = content.replace(/bg-\\[#f8fafc\\]/g, 'bg-blue-50/50');
            modified = true;
         }
         if (content.includes('bg-slate-50')) {
            // Replace ONLY on the wrapper div that has min-h-screen to avoid replacing card backgrounds if any
            content = content.replace(/className="[^"]*min-h-screen[^"]*bg-slate-50[^"]*"/g, match => match.replace('bg-slate-50', 'bg-blue-50/50'));
            modified = true;
         }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log('Updated background in: ' + fullPath);
      }
    }
  }
}
replaceInDir('src/app');
