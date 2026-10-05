// Inlines seed.js and days/*.js into app.html.
// Outputs:
//   index.html          standalone page (GitHub Pages / open locally)
//   relational-lab.html claude.ai Artifact version (the platform adds the document skeleton)
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const seed = fs.readFileSync(path.join(dir, 'seed.js'), 'utf8') + '\n' + fs.readFileSync(path.join(dir, 'facts.js'), 'utf8');
const days = fs.readdirSync(path.join(dir, 'days')).filter(f => /^day\d+\.js$/.test(f)).sort()
  .map(f => '// ---- ' + f + '\n' + fs.readFileSync(path.join(dir, 'days', f), 'utf8')).join('\n');
const page = fs.readFileSync(path.join(dir, 'app.html'), 'utf8')
  .replace('/*__SEED__*/', () => safe(seed))
  .replace('/*__DAYS__*/', () => safe(days));

fs.writeFileSync(path.join(dir, 'relational-lab.html'), page);

const cut = page.indexOf('<div class="topbar">');
const head = page.slice(0, cut), body = page.slice(cut);
const desc = 'A free 14-day interactive database course: a real SQL engine in your browser, graded exercises, quizzes and spaced review.';
const standalone = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="${desc}">
<meta property="og:title" content="Relational Lab">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
${head.trim()}
</head>
<body>
${body.trim()}
</body>
</html>
`;
fs.writeFileSync(path.join(dir, 'index.html'), standalone);
console.log('wrote index.html', (standalone.length / 1024).toFixed(0) + ' KB', 'and relational-lab.html');
