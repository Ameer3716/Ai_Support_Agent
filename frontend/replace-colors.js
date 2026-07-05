const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      content = content.replace(/void/g, 'base');
      content = content.replace(/storm/g, 'chic');
      content = content.replace(/ink-text/g, 'chic-900');
      content = content.replace(/ink-muted/g, 'chic-700');
      content = content.replace(/ink-dim/g, 'chic-500');
      content = content.replace(/text-ink/g, 'text-chic-900');
      content = content.replace(/text-white/g, 'text-chic-900');
      content = content.replace(/border-white/g, 'border-chic-900');
      content = content.replace(/bg-white/g, 'bg-chic-900');
      content = content.replace(/bg-teal/g, 'bg-chic-500');
      content = content.replace(/text-teal/g, 'text-chic-500');
      content = content.replace(/gold/g, 'chic');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

replaceInDir(path.join(__dirname, 'app'));
replaceInDir(path.join(__dirname, 'components'));
console.log('Replaced successfully');
