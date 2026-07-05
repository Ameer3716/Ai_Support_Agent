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
      
      // Cleanup any messy previous class names
      content = content.replace(/bg-bg-surface/g, 'bg-surface');
      content = content.replace(/bg-base-soft/g, 'bg-surface');
      content = content.replace(/bg-base-raised/g, 'bg-surface');
      content = content.replace(/bg-base/g, 'bg-bg');
      
      content = content.replace(/text-chic-900/g, 'text-text');
      content = content.replace(/text-chic-700/g, 'text-text-muted');
      content = content.replace(/text-chic-500/g, 'text-accent-text');
      content = content.replace(/text-chic-gradient/g, 'text-accent');
      content = content.replace(/bg-chic-[0-9]+/g, 'bg-accent');
      
      content = content.replace(/border-chic-[a-zA-Z0-9\/]+/g, 'border-border');
      
      // Map old 'glass' to 'card'
      content = content.replace(/glass-strong/g, 'card');
      content = content.replace(/glass/g, 'card');
      
      // Buttons
      content = content.replace(/btn-chic/g, 'btn-primary');
      content = content.replace(/variant="chic"/g, 'variant="primary"');
      content = content.replace(/btn-glass/g, 'btn-secondary');
      content = content.replace(/variant="glass"/g, 'variant="secondary"');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

replaceInDir(path.join(__dirname, 'app'));
replaceInDir(path.join(__dirname, 'components'));
console.log('Theme updated successfully');
