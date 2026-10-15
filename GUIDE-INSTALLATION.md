# Il Maestro — Pointage du personnel

## Comment ça marche

- **Le site** (les écrans de l'iPad et l'espace gérant) est hébergé gratuitement sur **GitHub Pages**.
- **Les données** (pointages, salariés, messages) sont enregistrées dans un **Google Sheet** du restaurant, grâce à un petit programme Google (Apps Script).
- Le fichier `config.js` fait le lien entre les deux : il contient l'adresse du programme Google.

```
iPad / téléphone  →  site GitHub Pages  →  programme Google  →  Google Sheet
```

Tant que `config.js` est vide, le site fonctionne en **mode démo** (fausses données, codes 1111 à 6666, mot de passe `maestro`).

---

## Installation (≈ 15 minutes, une seule fois)

### Étape 1 — Mettre le site sur GitHub

À la **racine** du repository, il faut ces fichiers (en remplaçant les anciens) :

```
index.html
config.js
icone.png
demo/core.js
demo/demo.js
google-apps-script/   (copie de sauvegarde du programme Google, pas utilisé par le site)
GUIDE-INSTALLATION.md
```

Supprimez l'ancien `demo.html` s'il y est encore. Dans **Settings → Pages**, la source doit être la branche `main`, dossier `/ (root)`.
L'adresse du site est alors : `https://VOTRE-COMPTE.github.io/NOM-DU-REPOSITORY/`

### Étape 2 — Créer le Google Sheet

1. Allez sur **sheets.google.com** avec le compte Google du restaurant.
2. Créez une **feuille vierge**, nommez-la `Il Maestro – Pointage`.

### Étape 3 — Coller le programme Google

1. Dans le Google Sheet : menu **Extensions → Apps Script**.
2. Dans le fichier `Code.gs` déjà ouvert : **effacez tout**, collez le contenu de `google-apps-script/Code.gs`.
3. À gauche, **+ → Script**, nommez-le `Core`, collez le contenu de `google-apps-script/Core.gs`.
4. Cliquez sur **Enregistrer** (icône disquette).

### Étape 4 — Installer

1. En haut, choisissez la fonction **installer** dans la liste, puis **Exécuter**.
2. Google demande une autorisation : **Examiner les autorisations** → choisissez le compte du restaurant.
3. Si « Google n'a pas validé cette application » s'affiche : c'est normal (c'est votre propre programme). Cliquez **Paramètres avancés** → **Accéder à … (non sécurisé)** → **Autoriser**.
4. Revenez sur le Google Sheet : les onglets **Salariés, Pointages, Absences, Messages, Réglages** sont créés, avec les 6 salariés (Jeannette, CATAREU Veronica, AMANOU Vincent, Victor, SUBASKARAN Saravanamuthu, RATNAM Thayalan) et un code à 4 chiffres tiré au hasard pour chacun.

### Étape 5 — Mettre le programme Google en ligne

1. Dans Apps Script : **Déployer → Nouveau déploiement**.
2. Roue dentée ⚙ à côté de « Sélectionner le type » → **Application Web**.
3. Exécuter en tant que : **Moi** · Qui a accès : **Tout le monde**.
4. **Déployer**, puis **copiez l'URL de l'application Web** (elle se termine par `/exec`).
5. Vérification : ouvrez cette URL dans un navigateur, vous devez voir `"Serveur de pointage Il Maestro opérationnel."`

### Étape 6 — Relier le site au Google Sheet

1. Sur GitHub, ouvrez le fichier **`config.js`** → icône crayon ✏️ (modifier).
2. Collez l'URL entre les guillemets :
   ```js
   window.POINTAGE_SERVEUR = 'https://script.google.com/macros/s/……/exec';
   ```
3. **Commit changes**. Attendez 1 à 2 minutes, puis rechargez le site : le cadre « Démo » en bas à gauche a disparu, c'est la vraie version.

### Étape 7 — Installer sur l'iPad

1. Sur l'iPad, ouvrez **Safari** à l'adresse du site GitHub Pages.
2. Bouton **Partager** ⬆️ → **Sur l'écran d'accueil**. L'icône « Il Maestro » apparaît comme une application.
3. *Conseil* : pour bloquer l'iPad sur le pointage, activez **Réglages → Accessibilité → Accès guidé**, puis triple-clic sur le bouton latéral dans l'application.

### Étape 8 — Premiers réglages (dans l'application)

1. **Espace gérant** (en bas de l'écran) → mot de passe de départ : **`maestro`**.
2. **Réglages** → **changez le mot de passe tout de suite**.
3. **Salariés** : notez le code de chacun et donnez-le-lui (il doit rester confidentiel). Ajustez le contrat si ce n'est pas 35 h (39 h, temps partiel…). Pour un nouveau salarié : **+ Ajouter un salarié**.

C'est prêt ✅

---

## Utilisation au quotidien

### Les salariés (sur l'iPad)
1. Ils tapent **leur code à 4 chiffres**.
2. Ils appuient sur **Arrivée** le matin, **Fin de service** quand ils partent (plusieurs fois par jour possible : midi et soir).
3. En cas d'erreur : **Signaler une erreur** → ils écrivent un message au gérant.

### Les règles automatiques
| Situation | Ce que fait l'application |
|---|---|
| Pas de pointage un jour d'ouverture | Le salarié est compté **absent** |
| Arrivée le matin, pas de fin de service | Départ mis **à 14h**, marqué « Sortie auto 14h » — le salarié doit vous donner sa vraie heure |
| Arrivée le soir, pas de fin de service | 0 h comptée, marqué « Oubli de sortie » — à corriger |
| Lundi | Restaurant fermé : personne n'est compté absent |

### Le gérant (Espace gérant — sur l'iPad, un téléphone ou un ordinateur, même adresse)
- **Aujourd'hui** : qui est en service, parti, absent.
- **Heures** : choisissez **Jour / Semaine / Mois** et les flèches ‹ › pour changer de période.
  - Touchez un salarié pour le détail jour par jour.
  - Touchez un horaire pour le **corriger**, ou **+** pour ajouter un pointage oublié.
  - Pour un jour non travaillé : **Repos / Congé payé / Maladie / Absence justifiée**.
- **Exporter Excel** : fichier de la période affichée, avec 3 onglets (Récapitulatif avec heures, heures sup. 10/20/50 % et absences · Par semaine · Détail de chaque pointage). C'est le fichier à transmettre pour les **bulletins de paie**. Le bouton **Ouvrir dans Google Sheets** crée la même chose dans Google Drive.
- **Messages** : les demandes de correction des salariés. Corrigez le pointage, puis **Traité**.

> L'espace gérant se ferme tout seul après 10 minutes sans activité.

### Heures supplémentaires
Calculées **par semaine (lundi → dimanche)** au-delà de 35 h, barème convention HCR : +10 % de la 36e à la 39e heure, +20 % de la 40e à la 43e, +50 % au-delà. En vue **Mois**, on compte les semaines qui **se terminent** dans le mois. **À valider par la personne qui fait la paie** (notamment pour les contrats à 39 h).

---

## Bon à savoir

- **Voir la démo même après la mise en service** : ajoutez `?demo` à la fin de l'adresse du site.
- **Ne modifiez pas l'onglet « Pointages » à la main** dans le Google Sheet : passez par l'espace gérant.
- **Sécurité** : l'adresse du programme Google est visible dans `config.js`, mais sans code personne ne peut pointer, et sans mot de passe personne n'entre dans l'espace gérant. D'où l'importance de **changer le mot de passe `maestro`** et de garder les codes confidentiels.
- **Mettre à jour le programme Google plus tard** : collez les nouveaux fichiers dans Apps Script, puis **Déployer → Gérer les déploiements → ✏️ → Version : Nouvelle version → Déployer**. L'URL ne change pas, `config.js` reste bon.
- **Côté légal** : informez les salariés par écrit de la mise en place du pointage et de son but (calcul du temps de travail et de la paie). Conservez les relevés au moins 1 an.

## Pour les développeurs
- `google-apps-script/Core.gs` contient toutes les règles. Après une modification, lancez `node outils/copier-core.js` pour mettre à jour la démo (`demo/core.js`).
