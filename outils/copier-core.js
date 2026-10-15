// Copie la logique du serveur (google-apps-script/Core.gs) vers demo/core.js,
// utilisé par le mode démo de index.html. À relancer après chaque modification de Core.gs :
//   node outils/copier-core.js
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const core = fs.readFileSync(path.join(racine, 'google-apps-script', 'Core.gs'), 'utf8');
fs.writeFileSync(path.join(racine, 'demo', 'core.js'),
  '// Copie automatique de google-apps-script/Core.gs (ne pas modifier ici)\n' + core);
console.log('demo/core.js mis à jour');
