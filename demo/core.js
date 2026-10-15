// Copie automatique de google-apps-script/Core.gs (ne pas modifier ici)
/**
 * IL MAESTRO — Pointage du personnel
 * Logique métier : arrivée, fin de service, clôture automatique, messages, gestion.
 *
 * Ce fichier ne dépend pas de Google : il travaille sur un objet "db" en mémoire
 *   db = { salaries: [], pointages: [], absences: [], messages: [], reglages: {} }
 * et une heure "now" = { date: 'aaaa-mm-jj', time: 'hh:mm' } (heure de Paris).
 * Code.gs se charge de lire / écrire ces données dans le Google Sheet.
 */
var Core = (function () {
  // Avant 5h du matin, on considère qu'on est encore sur la journée de la veille
  // (un salarié qui finit son service à 0h30 pointe sur la bonne journée).
  var FIN_JOURNEE = '05:00';

  var TYPES_ABSENCE = ['absent', 'repos', 'conge', 'maladie', 'justifie'];

  /* ---------- Outils dates / heures ---------- */

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function ajouterJours(date, n) {
    var p = date.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }

  function enMinutes(h) {
    var p = String(h).split(':');
    return (+p[0]) * 60 + (+p[1]);
  }

  /** Durée en minutes entre deux heures "hh:mm" (gère le passage de minuit). */
  function duree(arrivee, depart) {
    if (!arrivee || !depart) return 0;
    var m = enMinutes(depart) - enMinutes(arrivee);
    if (m < 0) m += 1440;
    return m;
  }

  function journeeDeService(now) {
    return now.time < FIN_JOURNEE ? ajouterJours(now.date, -1) : now.date;
  }

  function nouvelId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function erreur(message) { throw new Error(message); }

  /** Erreur d'accès (mauvais code / mot de passe) : comptée par Code.gs pour bloquer les essais en série. */
  function erreurAcces(type, message) {
    var e = new Error(message);
    e.acces = type;
    throw e;
  }

  /* ---------- Codes et mot de passe hachés ---------- */

  // Remplacé par un vrai hachage SHA-256 salé dans Code.gs ; cette version ne sert qu'à la démo.
  var hacher = function (secret) { return 'demo$' + secret; };
  function definirHachage(f) { hacher = f; }

  function estHache(v) { return /^(h1|demo)\$/.test(String(v || '')); }

  /** Compare une saisie à la valeur stockée (hachée, ou en clair pour les anciennes données). */
  function verifierSecret(saisi, stocke) {
    saisi = String(saisi || ''); stocke = String(stocke || '');
    if (!saisi || !stocke) return false;
    if (!estHache(stocke)) return saisi === stocke;
    return hacher(saisi, stocke) === stocke;
  }

  function verifierHeure(h, champ) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(h || ''))) erreur(champ + ' : heure invalide (format 10:30).');
  }

  function verifierDate(d) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))) erreur('Date invalide.');
  }

  function heureAuto(db) { return db.reglages.heureAuto || '14:00'; }

  /* ---------- Recherche ---------- */

  function salarieParCode(db, code) {
    code = String(code || '').trim();
    if (!code) return null;
    for (var i = 0; i < db.salaries.length; i++) {
      var s = db.salaries[i];
      if (s.actif && verifierSecret(code, s.code)) return s;
    }
    return null;
  }

  function salarieParId(db, id) {
    for (var i = 0; i < db.salaries.length; i++) if (db.salaries[i].id === id) return db.salaries[i];
    return null;
  }

  function pointageEnCours(db, sid) {
    for (var i = 0; i < db.pointages.length; i++) {
      var p = db.pointages[i];
      if (p.sid === sid && !p.depart) return p;
    }
    return null;
  }

  function pointagesDuJour(db, sid, date) {
    return db.pointages
      .filter(function (p) { return p.sid === sid && p.date === date; })
      .sort(function (a, b) { return a.arrivee < b.arrivee ? -1 : 1; });
  }

  /* ---------- Clôture automatique ---------- */

  /**
   * Ferme les pointages restés ouverts d'une journée passée :
   *  - arrivé avant 14h (le matin) et jamais ressorti -> départ fixé à 14h ("auto")
   *  - arrivé après 14h (le soir) et jamais ressorti  -> 0h compté, à corriger ("oubli")
   * Le salarié doit ensuite signaler son heure réelle de départ au gérant.
   */
  function cloturer(db, now) {
    var jour = journeeDeService(now);
    var limite = heureAuto(db);
    db.pointages.forEach(function (p) {
      if (p.depart || p.date >= jour) return;
      if (p.arrivee < limite) { p.depart = limite; p.statut = 'auto'; }
      else { p.depart = p.arrivee; p.statut = 'oubli'; }
    });
  }

  /* ---------- Tablette (salariés) ---------- */

  var CODE_INCONNU = 'Code inconnu. Vérifie ton code et recommence.';

  function identifier(db, now, args) {
    var s = salarieParCode(db, args.code);
    if (!s) erreurAcces('code', CODE_INCONNU);
    var jour = journeeDeService(now);
    var ouvert = pointageEnCours(db, s.id);
    return {
      nom: s.nom,
      present: !!ouvert,
      depuis: ouvert ? ouvert.arrivee : null,
      duJour: pointagesDuJour(db, s.id, jour).map(function (p) {
        return { arrivee: p.arrivee, depart: p.depart, statut: p.statut };
      })
    };
  }

  function pointer(db, now, args) {
    var s = salarieParCode(db, args.code);
    if (!s) erreurAcces('code', CODE_INCONNU);
    var jour = journeeDeService(now);
    var ouvert = pointageEnCours(db, s.id);
    var limite = heureAuto(db);

    if (args.action === 'arrivee') {
      if (ouvert) {
        // Pointé le matin, pas de fin de service, et revient l'après-midi / le soir :
        // on ferme le service du matin à 14h et on ouvre le nouveau.
        if (ouvert.date === jour && ouvert.arrivee < limite && now.time >= limite) {
          ouvert.depart = limite;
          ouvert.statut = 'auto';
        } else {
          erreur('Tu es déjà pointé depuis ' + ouvert.arrivee + '. Pour partir, appuie sur « Fin de service ».');
        }
      }
      db.pointages.push({
        id: nouvelId(), sid: s.id, nom: s.nom, date: jour,
        arrivee: now.time, depart: '', statut: 'normal', note: ''
      });
      return { nom: s.nom, action: 'arrivee', heure: now.time };
    }

    if (args.action === 'depart') {
      if (!ouvert) erreur("Tu n'as pas pointé ton arrivée. Utilise « Signaler une erreur » pour prévenir le gérant.");
      ouvert.depart = now.time;
      var total = pointagesDuJour(db, s.id, ouvert.date).reduce(function (t, p) { return t + duree(p.arrivee, p.depart); }, 0);
      return { nom: s.nom, action: 'depart', heure: now.time, totalJour: total };
    }

    erreur('Action inconnue.');
  }

  function signaler(db, now, args) {
    var s = salarieParCode(db, args.code);
    if (!s) erreurAcces('code', CODE_INCONNU);
    var texte = String(args.texte || '').trim();
    if (texte.length < 3) erreur('Écris ton message avant de l’envoyer.');
    db.messages.push({
      id: nouvelId(), quand: now.date + ' ' + now.time, sid: s.id, nom: s.nom,
      texte: texte.slice(0, 1000), traite: false
    });
    return { nom: s.nom };
  }

  /* ---------- Espace gérant ---------- */

  function verifierMdp(db, mdp) {
    if (!verifierSecret(mdp, db.reglages.motDePasse)) erreurAcces('mdp', 'Mot de passe incorrect.');
  }

  function charger(db, now) {
    return {
      // Les codes ne quittent jamais le serveur
      salaries: db.salaries.map(function (s) {
        return { id: s.id, nom: s.nom, contrat: s.contrat, actif: s.actif, entree: s.entree, aCode: !!s.code };
      }),
      pointages: db.pointages,
      absences: db.absences,
      messages: db.messages,
      reglages: { heureAuto: heureAuto(db), joursFermes: db.reglages.joursFermes || [] },
      now: { date: now.date, time: now.time, journee: journeeDeService(now) }
    };
  }

  function enregistrerPointage(db, now, args) {
    var p = args.pointage || {};
    var s = salarieParId(db, p.sid);
    if (!s) erreur('Salarié introuvable.');
    verifierDate(p.date);
    verifierHeure(p.arrivee, 'Arrivée');
    if (p.depart) verifierHeure(p.depart, 'Départ');
    var note = String(p.note || '').slice(0, 300);

    if (p.id) {
      var existant = db.pointages.filter(function (x) { return x.id === p.id; })[0];
      if (!existant) erreur('Pointage introuvable.');
      existant.sid = s.id; existant.nom = s.nom; existant.date = p.date;
      existant.arrivee = p.arrivee; existant.depart = p.depart || ''; existant.note = note;
      existant.statut = 'modifie';
    } else {
      db.pointages.push({
        id: nouvelId(), sid: s.id, nom: s.nom, date: p.date,
        arrivee: p.arrivee, depart: p.depart || '', statut: 'manuel', note: note
      });
      // Un jour travaillé n'est plus une absence
      db.absences = db.absences.filter(function (a) { return !(a.sid === s.id && a.date === p.date); });
    }
  }

  function supprimerPointage(db, now, args) {
    db.pointages = db.pointages.filter(function (p) { return p.id !== args.id; });
  }

  function definirAbsence(db, now, args) {
    var s = salarieParId(db, args.sid);
    if (!s) erreur('Salarié introuvable.');
    verifierDate(args.date);
    db.absences = db.absences.filter(function (a) { return !(a.sid === s.id && a.date === args.date); });
    if (args.type) {
      if (TYPES_ABSENCE.indexOf(args.type) < 0) erreur("Type d'absence inconnu.");
      db.absences.push({ sid: s.id, nom: s.nom, date: args.date, type: args.type });
    }
  }

  function enregistrerSalarie(db, now, args) {
    var x = args.salarie || {};
    var nom = String(x.nom || '').trim();
    var code = String(x.code || '').trim();
    var contrat = Number(x.contrat) || 35;
    if (!nom) erreur('Le nom est obligatoire.');
    if (!x.id && !code) erreur('Choisissez un code pour ce salarié.');
    if (code) {
      if (!/^\d{4}$/.test(code)) erreur('Le code doit contenir exactement 4 chiffres.');
      var doublon = db.salaries.filter(function (s) { return s.id !== x.id && s.actif && verifierSecret(code, s.code); })[0];
      if (doublon) erreur('Ce code est déjà utilisé par ' + doublon.nom + '. Générez-en un autre.');
    }

    if (x.id) {
      var s = salarieParId(db, x.id);
      if (!s) erreur('Salarié introuvable.');
      s.nom = nom; s.contrat = contrat; s.actif = x.actif !== false;
      if (code) s.code = hacher(code);
      // Garder le nom à jour dans les pointages (lisibilité du Google Sheet)
      db.pointages.forEach(function (p) { if (p.sid === s.id) p.nom = nom; });
      db.absences.forEach(function (a) { if (a.sid === s.id) a.nom = nom; });
    } else {
      db.salaries.push({ id: nouvelId(), nom: nom, code: hacher(code), contrat: contrat, actif: x.actif !== false, entree: x.entree || now.date });
    }
  }

  function traiterMessage(db, now, args) {
    db.messages.forEach(function (m) { if (m.id === args.id) m.traite = !!args.traite; });
  }

  function enregistrerReglages(db, now, args) {
    var r = args.reglages || {};
    if (r.heureAuto) { verifierHeure(r.heureAuto, 'Heure de clôture'); db.reglages.heureAuto = r.heureAuto; }
    if (Array.isArray(r.joursFermes)) {
      db.reglages.joursFermes = r.joursFermes.map(Number).filter(function (j) { return j >= 0 && j <= 6; });
    }
    if (r.nouveauMdp) {
      if (String(r.nouveauMdp).length < 8) erreur('Le mot de passe doit faire au moins 8 caractères.');
      db.reglages.motDePasse = hacher(String(r.nouveauMdp));
    }
  }

  /* ---------- Point d'entrée unique ---------- */

  var PUBLIC = { identifier: identifier, pointer: pointer, signaler: signaler };

  var GERANT = {
    charger: function () {},
    enregistrerPointage: enregistrerPointage,
    supprimerPointage: supprimerPointage,
    definirAbsence: definirAbsence,
    enregistrerSalarie: enregistrerSalarie,
    traiterMessage: traiterMessage,
    enregistrerReglages: enregistrerReglages
  };

  /**
   * Exécute une action. Les actions du gérant vérifient le mot de passe
   * et renvoient toujours les données à jour.
   */
  function executer(db, now, nom, args) {
    args = args || {};
    db.reglages = db.reglages || {};
    cloturer(db, now);
    if (PUBLIC[nom]) return PUBLIC[nom](db, now, args);
    if (GERANT[nom]) {
      verifierMdp(db, args.mdp);
      GERANT[nom](db, now, args);
      return charger(db, now);
    }
    erreur('Action inconnue : ' + nom);
  }

  /** 'code' pour les actions de la tablette, 'mdp' pour celles du gérant. */
  function typeAcces(nom) { return PUBLIC[nom] ? 'code' : GERANT[nom] ? 'mdp' : null; }

  return {
    executer: executer,
    typeAcces: typeAcces,
    definirHachage: definirHachage,
    verifierMdp: verifierMdp,
    cloturer: cloturer,
    duree: duree,
    ajouterJours: ajouterJours,
    journeeDeService: journeeDeService
  };
})();
