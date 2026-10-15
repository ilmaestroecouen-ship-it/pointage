/**
 * Démo hors ligne : remplace le Google Sheet par le stockage du navigateur.
 * Utilisé par index.html quand aucun serveur n'est configuré dans config.js (ou avec ?demo dans l'adresse).
 */
window.DEMO = (function () {
  var CLE = 'ilmaestro-demo-v2';
  var EQUIPE = [['Jeannette', '1111'], ['CATAREU Veronica', '2222'], ['AMANOU Vincent', '3333'],
    ['Victor', '4444'], ['SUBASKARAN Saravanamuthu', '5555'], ['RATNAM Thayalan', '6666']];
  var memoire = null;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function now() {
    var d = new Date();
    return { date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), time: pad(d.getHours()) + ':' + pad(d.getMinutes()) };
  }
  function heure(base, ecart) {
    var m = base + Math.round((Math.random() * 2 - 1) * ecart);
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  }
  function jourSem(d) { var p = d.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }

  function creer() {
    var n = now();
    var debut = Core.ajouterJours(n.date, -50);
    var db = { salaries: [], pointages: [], absences: [], messages: [], reglages: { heureAuto: '14:00', joursFermes: [1], motDePasse: 'maestro' } };
    EQUIPE.forEach(function (x, i) {
      db.salaries.push({ id: 's' + (i + 1), nom: x[0], code: x[1], contrat: i === 2 ? 39 : 35, actif: true, entree: debut });
    });
    var k = 0;
    for (var d = debut; d < n.date; d = Core.ajouterJours(d, 1)) {
      var w = jourSem(d);
      if (w === 1) continue; // lundi fermé
      db.salaries.forEach(function (s, i) {
        var r = Math.random();
        if (r < 0.06) return;                                             // absent
        if (r < 0.09) { db.absences.push({ sid: s.id, nom: s.nom, date: d, type: 'conge' }); return; }
        if (r < 0.11) { db.absences.push({ sid: s.id, nom: s.nom, date: d, type: 'maladie' }); return; }
        var oubli = Math.random() < 0.03;
        db.pointages.push({ id: 'p' + (k++), sid: s.id, nom: s.nom, date: d, arrivee: heure(600, 12),
          depart: oubli ? '14:00' : heure(i < 3 ? 930 : 900, 25), statut: oubli ? 'auto' : 'normal', note: '' });
        if ((w === 5 || w === 6 || w === 0) && i % 2 === 0 && Math.random() < 0.8) {
          db.pointages.push({ id: 'p' + (k++), sid: s.id, nom: s.nom, date: d, arrivee: heure(1110, 10), depart: heure(1395, 20), statut: 'normal', note: '' });
        }
      });
    }
    // Aujourd'hui : une partie de l'équipe est déjà arrivée
    if (jourSem(n.date) !== 1 && n.time >= '10:10') {
      db.salaries.slice(0, 4).forEach(function (s) {
        var arr = heure(600, 8);
        db.pointages.push({ id: 'p' + (k++), sid: s.id, nom: s.nom, date: n.date, arrivee: arr, depart: '', statut: 'normal', note: '' });
      });
    }
    // Un message d'un salarié qui a oublié sa fin de service
    var hier = Core.ajouterJours(n.date, jourSem(n.date) === 2 ? -2 : -1);
    var g = db.pointages.filter(function (p) { return p.sid === 's2' && p.date === hier; })[0];
    if (g) { g.depart = '14:00'; g.statut = 'auto'; }
    db.messages.push({ id: 'm1', quand: hier + ' 15:42', sid: 's2', nom: db.salaries[1].nom,
      texte: "J'ai oublié de pointer ma fin de service. Je suis partie à 15h20.", traite: false });
    return db;
  }

  function charger() {
    if (memoire) return memoire;
    try { var t = localStorage.getItem(CLE); if (t) return (memoire = JSON.parse(t)); } catch (e) { }
    memoire = creer();
    sauver();
    return memoire;
  }
  function sauver() { try { localStorage.setItem(CLE, JSON.stringify(memoire)); } catch (e) { } }

  return {
    codes: EQUIPE,
    api: function (nom, args) {
      var db = charger();
      try { return JSON.parse(JSON.stringify(Core.executer(db, now(), nom, args) || null)); }
      finally { sauver(); }
    },
    exporterGoogleSheet: function () { throw new Error('Disponible une fois installé sur Google.'); },
    reset: function () { try { localStorage.removeItem(CLE); } catch (e) { } memoire = null; }
  };
})();
