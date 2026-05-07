const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Soften fonts
    content = content.replace(/font-black/g, 'font-bold');
    content = content.replace(/tracking-tighter/g, 'tracking-tight');
    content = content.replace(/uppercase tracking-\[0\.2em\]/g, 'tracking-wider');
    content = content.replace(/uppercase tracking-widest/g, 'font-medium text-muted-foreground');
    content = content.replace(/text-\[10px\]/g, 'text-xs');
    content = content.replace(/text-\[9px\]/g, 'text-xs');
    
    // Remove aggressive italics from main headers
    content = content.replace(/uppercase tracking-tight italic/g, 'tracking-tight');
    content = content.replace(/uppercase tracking-tight/g, 'tracking-tight');
    
    // Clean up Sidebar CUI
    if (file.includes('Sidebar.tsx')) {
        content = content.replace(/<h1 className="text-primary font-bold leading-tight text-sm tracking-tight italic">CUI<\/h1>/g, '<h1 className="text-foreground font-bold leading-tight text-base">CUI Clearance<\/h1>');
        content = content.replace(/<p className="text-xs font-bold font-medium text-muted-foreground text-primary leading-none">Clearance System<\/p>/g, '<p className="text-xs text-muted-foreground leading-none">System Portal<\/p>');
        // Fix any malformed replacements above
        content = content.replace(/<p className="text-xs font-bold uppercase tracking-\[0\.2em\] text-primary leading-none">Clearance System<\/p>/g, '<p className="text-xs text-muted-foreground leading-none">System Portal<\/p>');
        content = content.replace(/<p className="text-xs font-bold uppercase tracking-wider text-primary leading-none">Clearance System<\/p>/g, '<p className="text-xs text-muted-foreground leading-none">System Portal<\/p>');
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
