/**
 * IL MAESTRO — Pointage du personnel
 * Lien entre l'application et le Google Sheet.
 *
 * Installation : exécuter une fois la fonction « installer » (menu Exécuter),
 * puis Déployer > Nouveau déploiement > Application Web.
 */

var FUSEAU = 'Europe/Paris';

var TABLES = {
  salaries: {
    feuille: 'Salariés',
    cols: ['id', 'nom', 'code', 'contrat', 'actif', 'entree'],
    entetes: ['ID', 'Nom', 'Code (4 chiffres)', 'Heures contrat / semaine', 'Actif (oui/non)', "Date d'entrée"]
  },
  pointages: {
    feuille: 'Pointages',
    cols: ['id', 'sid', 'nom', 'date', 'arrivee', 'depart', 'statut', 'note'],
    entetes: ['ID', 'ID salarié', 'Nom', 'Date', 'Arrivée', 'Départ', 'Statut', 'Note du gérant']
  },
  absences: {
    feuille: 'Absences',
    cols: ['sid', 'nom', 'date', 'type'],
    entetes: ['ID salarié', 'Nom', 'Date', 'Type']
  },
  messages: {
    feuille: 'Messages',
    cols: ['id', 'quand', 'sid', 'nom', 'texte', 'traite'],
    entetes: ['ID', 'Date et heure', 'ID salarié', 'Nom', 'Message', 'Traité (oui/non)']
  }
};

var FEUILLE_REGLAGES = 'Réglages';

// Salariés créés à l'installation (on en ajoute ensuite dans l'espace gérant → Salariés)
var EQUIPE_DE_DEPART = [
  'Jeannette',
  'CATAREU Veronica',
  'AMANOU Vincent',
  'Victor',
  'SUBASKARAN Saravanamuthu',
  'RATNAM Thayalan'
];

/* ---------- API appelée par le site (GitHub Pages) ---------- */

/** Ouvrir l'URL /exec dans un navigateur affiche ce message : pratique pour vérifier que tout marche. */
function doGet() {
  return json_({ ok: true, message: 'Serveur de pointage Il Maestro opérationnel.' });
}

/** Le site envoie { fonction: 'api' | 'exporterGoogleSheet', args: [...] }. */
function doPost(e) {
  var AUTORISEES = { api: api, exporterGoogleSheet: exporterGoogleSheet };
  try {
    var demande = JSON.parse(e.postData.contents);
    var f = AUTORISEES[demande.fonction];
    if (!f) throw new Error('Fonction inconnue.');
    return json_({ ok: true, resultat: f.apply(null, demande.args || []) });
  } catch (err) {
    return json_({ ok: false, erreur: String(err && err.message || err) });
  }
}

function json_(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet)).setMimeType(ContentService.MimeType.JSON);
}

function api(nom, args) {
  var verrou = LockService.getScriptLock();
  verrou.waitLock(20000);
  try {
    var db = lire_();
    var avant = empreintes_(db);
    var resultat = Core.executer(db, maintenant_(), nom, args);
    ecrireModifications_(db, avant);
    return JSON.parse(JSON.stringify(resultat === undefined ? null : resultat));
  } finally {
    verrou.releaseLock();
  }
}

/** Crée un Google Sheet avec l'export (alternative au téléchargement Excel). */
function exporterGoogleSheet(mdp, titre, feuilles) {
  var db = lire_();
  Core.verifierMdp(db, mdp);
  var classeur = SpreadsheetApp.create(titre);
  feuilles.forEach(function (f, i) {
    var sh = i === 0 ? classeur.getSheets()[0] : classeur.insertSheet();
    sh.setName(f.nom);
    if (!f.lignes.length) return;
    var largeur = Math.max.apply(null, f.lignes.map(function (l) { return l.length; }));
    var lignes = f.lignes.map(function (l) { while (l.length < largeur) l.push(''); return l; });
    sh.getRange(1, 1, lignes.length, largeur).setValues(lignes);
    styliserEntete_(sh, largeur);
    sh.autoResizeColumns(1, largeur);
  });
  return classeur.getUrl();
}

/** Déclencheur de nuit : ferme les pointages oubliés (départ à 14h). */
function clotureNocturne() {
  var verrou = LockService.getScriptLock();
  verrou.waitLock(20000);
  try {
    var db = lire_();
    var avant = empreintes_(db);
    Core.cloturer(db, maintenant_());
    ecrireModifications_(db, avant);
  } finally {
    verrou.releaseLock();
  }
}

/* ---------- Installation ---------- */

function installer() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(FUSEAU);

  Object.keys(TABLES).forEach(function (cle) {
    var t = TABLES[cle];
    var sh = ss.getSheetByName(t.feuille) || ss.insertSheet(t.feuille);
    sh.getRange(1, 1, 1, t.cols.length).setValues([t.entetes]);
    sh.getRange(1, 1, sh.getMaxRows(), t.cols.length).setNumberFormat('@');
    styliserEntete_(sh, t.cols.length);
    sh.hideColumns(1); // colonne ID technique
    if (cle === 'pointages' || cle === 'messages') sh.hideColumns(t.cols.indexOf('sid') + 1);
  });

  // Réglages
  var r = ss.getSheetByName(FEUILLE_REGLAGES) || ss.insertSheet(FEUILLE_REGLAGES);
  if (r.getLastRow() < 2) {
    r.getRange(1, 1, 4, 3).setValues([
      ['Réglage', 'Valeur', 'Explication'],
      ['heureAuto', '14:00', "Heure de départ mise automatiquement quand quelqu'un oublie de pointer sa fin de service"],
      ['joursFermes', '1', 'Jours de fermeture (0 = dimanche, 1 = lundi, ... 6 = samedi), séparés par des virgules'],
      ['motDePasse', 'maestro', "Mot de passe de l'espace gérant (à changer !)"]
    ]);
    r.getRange(1, 1, 4, 3).setNumberFormat('@');
    styliserEntete_(r, 3);
    r.autoResizeColumns(1, 3);
  }

  // L'équipe de départ. Les codes sont tirés au hasard ici, et pas écrits dans le code
  // (qui est public sur GitHub). On les retrouve dans l'onglet « Salariés ».
  var db = lire_();
  if (!db.salaries.length) {
    var codes = {};
    EQUIPE_DE_DEPART.forEach(function (nom, i) {
      var code;
      do { code = String(1000 + Math.floor(Math.random() * 9000)); } while (codes[code]);
      codes[code] = true;
      db.salaries.push({
        id: 's' + (i + 1), nom: nom, code: code, contrat: 35, actif: true,
        entree: Utilities.formatDate(new Date(), FUSEAU, 'yyyy-MM-dd')
      });
    });
    ecrireTable_('salaries', db.salaries);
  }

  // Supprimer la feuille vide d'origine si elle existe
  var vide = ss.getSheetByName('Feuille 1') || ss.getSheetByName('Sheet1');
  if (vide && ss.getSheets().length > 1 && vide.getLastRow() === 0) ss.deleteSheet(vide);

  // Clôture automatique chaque nuit vers 5h
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'clotureNocturne') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('clotureNocturne').timeBased().everyDays(1).atHour(5).nearMinute(15).inTimezone(FUSEAU).create();

  Logger.log('Installation terminée. Codes des salariés : voir l’onglet « Salariés ». Mot de passe gérant : maestro');
}

/* ---------- Lecture / écriture du Google Sheet ---------- */

function maintenant_() {
  var d = new Date();
  return { date: Utilities.formatDate(d, FUSEAU, 'yyyy-MM-dd'), time: Utilities.formatDate(d, FUSEAU, 'HH:mm') };
}

function lire_() {
  var db = {};
  Object.keys(TABLES).forEach(function (cle) { db[cle] = lireTable_(cle); });
  db.reglages = lireReglages_();
  return db;
}

function lireTable_(cle) {
  var t = TABLES[cle];
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(t.feuille);
  if (!sh || sh.getLastRow() < 2) return [];
  var valeurs = sh.getRange(2, 1, sh.getLastRow() - 1, t.cols.length).getDisplayValues();
  return valeurs
    .filter(function (l) { return l.join('') !== ''; })
    .map(function (l) {
      var o = {};
      t.cols.forEach(function (c, i) { o[c] = String(l[i]).trim(); });
      if ('actif' in o) o.actif = o.actif.toLowerCase() !== 'non' && o.actif.toLowerCase() !== 'false';
      if ('traite' in o) o.traite = o.traite.toLowerCase() === 'oui' || o.traite.toLowerCase() === 'true';
      if ('contrat' in o) o.contrat = Number(String(o.contrat).replace(',', '.')) || 35;
      return o;
    });
}

function ecrireTable_(cle, lignes) {
  var t = TABLES[cle];
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(t.feuille);
  var ancien = sh.getLastRow() - 1;
  if (ancien > 0) sh.getRange(2, 1, ancien, t.cols.length).clearContent();
  if (!lignes.length) return;
  var valeurs = lignes.map(function (o) {
    return t.cols.map(function (c) {
      var v = o[c];
      if (typeof v === 'boolean') return v ? 'oui' : 'non';
      return v === undefined || v === null ? '' : String(v);
    });
  });
  var manque = valeurs.length + 1 - sh.getMaxRows();
  if (manque > 0) sh.insertRowsAfter(sh.getMaxRows(), manque + 500);
  var plage = sh.getRange(2, 1, valeurs.length, t.cols.length);
  plage.setNumberFormat('@');
  plage.setValues(valeurs);
}

function lireReglages_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_REGLAGES);
  var r = { heureAuto: '14:00', joursFermes: [1], motDePasse: 'maestro' };
  if (!sh || sh.getLastRow() < 2) return r;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues().forEach(function (l) {
    var cle = String(l[0]).trim(), val = String(l[1]).trim();
    if (cle === 'heureAuto' && val) r.heureAuto = val;
    if (cle === 'motDePasse' && val) r.motDePasse = val;
    if (cle === 'joursFermes') r.joursFermes = val === '' ? [] : val.split(/[,; ]+/).map(Number);
  });
  return r;
}

function ecrireReglages_(r) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_REGLAGES);
  var lignes = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues();
  lignes.forEach(function (l, i) {
    var cle = String(l[0]).trim();
    var val = cle === 'joursFermes' ? r.joursFermes.join(',') : r[cle];
    if (val !== undefined) sh.getRange(i + 2, 2).setValue(String(val));
  });
}

/** Garde une empreinte de chaque table pour n'écrire que ce qui a changé. */
function empreintes_(db) {
  var e = {};
  Object.keys(TABLES).forEach(function (cle) { e[cle] = JSON.stringify(db[cle]); });
  e.reglages = JSON.stringify(db.reglages);
  return e;
}

function ecrireModifications_(db, avant) {
  Object.keys(TABLES).forEach(function (cle) {
    if (JSON.stringify(db[cle]) !== avant[cle]) ecrireTable_(cle, db[cle]);
  });
  if (JSON.stringify(db.reglages) !== avant.reglages) ecrireReglages_(db.reglages);
}

function styliserEntete_(sh, largeur) {
  sh.getRange(1, 1, 1, largeur)
    .setBackground('#7B1E2B').setFontColor('#FFFCF6').setFontWeight('bold');
  sh.setFrozenRows(1);
}
