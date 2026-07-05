const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

css = css.replace(/:root \{[\s\S]*?--shadow-md:[^;]+;\n\}/, `:root {
  /* brand DNA mapped to Cloud Calm */
  --ink: #FFFFFF;
  --paper: #F0EEE9;
  --panel: #FFFFFF;
  --border: #DDD9D0;
  --border-strong: #C4BFA9;
  --text: #2B2A28;
  --muted: #6B6963;
  --amber: #6E8CA0;
  --amber-dark: #5A7689;
  --amber-ink: #F7F5F1;
  --amber-soft: rgba(110, 140, 160, 0.15);
  --teal: #8B6F8B;
  --teal-soft: rgba(139, 111, 139, 0.15);
  --danger: #ef4444;
  --danger-soft: rgba(239, 68, 68, 0.15);
  --sidebar-text: #2B2A28;
  --sidebar-muted: #6B6963;
  --sidebar-border: #DDD9D0;
  --serif: "Fraunces", Georgia, serif;
  --mono: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
  --sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --shadow-sm: 0 1px 2px rgba(43, 42, 40, 0.06);
  --shadow-md: 0 4px 12px rgba(43, 42, 40, 0.08);
}`);

css = css.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.03\s*\)/g, 'rgba(0, 0, 0, 0.03)');
css = css.replace(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.4\s*\)/g, 'var(--paper)');
css = css.replace(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.5\s*\)/g, 'var(--paper)');
css = css.replace(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.6\s*\)/g, 'var(--panel)');
css = css.replace(/rgba\(\s*250\s*,\s*204\s*,\s*21\s*,\s*0\.2\s*\)/g, 'rgba(110, 140, 160, 0.2)');
css = css.replace(/rgba\(\s*250\s*,\s*204\s*,\s*21\s*,\s*0\.3\s*\)/g, 'rgba(110, 140, 160, 0.3)');
css = css.replace(/#0a0a0a/g, 'var(--panel)');
css = css.replace(/#d9d4c4/g, 'var(--text)');
css = css.replace(/#f2ede4/g, 'var(--amber-ink)');
css = css.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.06\s*\)/g, 'var(--border)');
css = css.replace(/rgba\(\s*237\s*,\s*228\s*,\s*225\s*,\s*0\.06\s*\)/g, 'rgba(0,0,0,0.04)');
css = css.replace(/rgba\(\s*232\s*,\s*163\s*,\s*61\s*,\s*0\.13\s*\)/g, 'var(--amber-soft)');
css = css.replace(/rgba\(\s*20\s*,\s*23\s*,\s*31\s*,\s*0\.55\s*\)/g, 'rgba(255, 255, 255, 0.7)');

fs.writeFileSync('styles.css', css);
console.log('Admin styles updated.');
