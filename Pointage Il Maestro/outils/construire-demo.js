// Génère demo.html (version de démonstration sans Google) à partir des fichiers de l'application.
// Usage : node outils/construire-demo.js
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const src = path.join(racine, 'google-apps-script');
const html = fs.readFileSync(path.join(src, 'Index.html'), 'utf8');
const core = fs.readFileSync(path.join(src, 'Core.gs'), 'utf8');
const demo = fs.readFileSync(path.join(__dirname, 'demo-adapter.js'), 'utf8');

if (!html.includes('<!--DEMO-->')) throw new Error('Repère <!--DEMO--> introuvable dans Index.html');
const sortie = html.replace('<!--DEMO-->', () => `<script>\n${core}\n${demo}\n</script>`);
fs.writeFileSync(path.join(racine, 'demo.html'), sortie);
console.log('demo.html généré');
