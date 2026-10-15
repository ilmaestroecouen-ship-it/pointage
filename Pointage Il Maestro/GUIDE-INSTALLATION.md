# Il Maestro : pointage du personnel

## Guide d'installation (environ 15 minutes, à faire une seule fois)

Il vous faut un **ordinateur** (pour l'installation), le **compte Google du restaurant** et l'**iPad**.

Les données (pointages, messages, salariés) sont enregistrées dans un **Google Sheet** qui appartient au restaurant. Elles restent consultables à tout moment depuis Google Drive.

---

### Étape 1 : créer le Google Sheet

1. Allez sur **sheets.google.com**, connecté avec le compte Google du restaurant.
2. Créez une **feuille vierge** et nommez-la `Il Maestro – Pointage`.

### Étape 2 : coller le programme

1. Dans le Google Sheet, ouvrez le menu **Extensions → Apps Script**. Un nouvel onglet s'ouvre.
2. Le fichier `Code.gs` est déjà ouvert : **effacez tout** son contenu, puis collez le contenu du fichier `google-apps-script/Code.gs`.
3. À gauche, à côté de « Fichiers », cliquez sur **+ → Script**, nommez-le `Core` et collez le contenu de `google-apps-script/Core.gs`.
4. Cliquez sur **+ → HTML**, nommez-le `Index` (exactement, avec un I majuscule) et collez le contenu de `google-apps-script/Index.html`.
5. Cliquez sur l'icône **Enregistrer** (la disquette).

### Étape 3 : installer

1. En haut, dans la liste des fonctions, choisissez **installer**, puis cliquez sur **Exécuter**.
2. Google demande une autorisation : **Examiner les autorisations**, puis choisissez le compte du restaurant.
3. Si Google affiche « Google n'a pas validé cette application », c'est normal (c'est votre propre programme). Cliquez sur **Paramètres avancés**, puis **Accéder à … (non sécurisé)**, puis **Autoriser**.
4. Revenez sur le Google Sheet. Vous y trouvez les onglets **Salariés, Pointages, Absences, Messages et Réglages**, avec 8 salariés créés et un code chacun.

### Étape 4 : mettre l'application en ligne

1. Dans Apps Script, cliquez sur **Déployer → Nouveau déploiement**.
2. Cliquez sur la roue dentée ⚙ à côté de « Sélectionner le type » et choisissez **Application Web**.
3. Réglez les champs ainsi :
   - Description : `Pointage`
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
4. Cliquez sur **Déployer** et **copiez l'URL de l'application Web** (elle se termine par `/exec`).

### Étape 5 : installer sur l'iPad

1. Sur l'iPad, ouvrez **Safari** et collez l'URL.
2. Appuyez sur le bouton **Partager** ⬆️, puis **Sur l'écran d'accueil**. L'icône « Il Maestro » apparaît sur l'iPad comme une application.
3. *Conseil* : pour que l'iPad reste bloqué sur le pointage, activez **Réglages → Accessibilité → Accès guidé**, puis lancez-le dans l'application avec un triple-clic sur le bouton latéral.

### Étape 6 : premiers réglages (dans l'application)

1. Appuyez sur **Espace gérant** en bas de l'écran. Le mot de passe de départ est **`maestro`**.
2. Dans **Réglages**, **changez le mot de passe** tout de suite.
3. Dans **Salariés**, remplacez « Salarié 1 », « Salarié 2 », etc. par les vrais prénoms. Ajustez le contrat (35 h, 39 h…) et donnez à chacun **son code**, qu'il doit garder pour lui.

C'est prêt ✅

---

## Utilisation au quotidien

### Les salariés, sur l'iPad
1. Ils tapent **leur code à 4 chiffres**.
2. Ils appuient sur **Arrivée** le matin, puis sur **Fin de service** quand ils partent.
3. En cas d'erreur, ils appuient sur **Signaler une erreur** et écrivent un message au gérant.

Ils peuvent pointer plusieurs fois par jour, par exemple le midi puis le soir.

### Les règles automatiques
| Situation | Ce que fait l'application |
|---|---|
| Pas de pointage un jour d'ouverture | Le salarié est compté **absent** |
| Arrivée pointée le matin, pas de fin de service | Départ mis **à 14h** et marqué « Sortie auto 14h ». Le salarié doit vous donner sa vraie heure de départ |
| Arrivée pointée le soir, pas de fin de service | 0 h comptée, marqué « Oubli de sortie », à corriger |
| Lundi | Restaurant fermé : personne n'est compté absent |

### Le gérant (Espace gérant, sur l'iPad, un téléphone ou un ordinateur, avec la même URL)
- **Aujourd'hui** : qui est en service, qui est parti, qui est absent.
- **Heures** : choix **Jour / Semaine / Mois** et flèches ‹ › pour changer de période.
  - Touchez un salarié pour voir le détail jour par jour.
  - Touchez un horaire pour le **corriger**, ou **+** pour ajouter un pointage oublié.
  - Pour un jour non travaillé, choisissez **Repos / Congé payé / Maladie / Absence justifiée**.
- **Exporter Excel** : télécharge un fichier pour la période affichée, avec 3 onglets :
  - **Récapitulatif** : par salarié, heures totales, heures sup. 10 / 20 / 50 % et absences.
  - **Par semaine**
  - **Détail** : chaque pointage.

  C'est le fichier à transmettre pour les **bulletins de paie**.
- **Messages** : les demandes de correction des salariés. Corrigez le pointage, puis cliquez sur **Traité**.

> L'espace gérant se ferme tout seul après 10 minutes sans activité, pour que les salariés ne puissent pas y accéder.

### Calcul des heures supplémentaires
Les heures sup. sont calculées **par semaine, du lundi au dimanche**, au-delà de 35 h, selon le barème de la convention HCR :
- +10 % de la 36e à la 39e heure ;
- +20 % de la 40e à la 43e heure ;
- +50 % au-delà.

En vue **Mois**, on compte les semaines qui **se terminent** dans le mois. La colonne « Contrat » rappelle la durée prévue au contrat. Pour un salarié à 39 h, les heures entre 36 et 39 sont donc déjà incluses dans son salaire. **À valider par la personne qui fait la paie.**

---

## Bon à savoir

- **Si le bouton « Exporter Excel » ne télécharge rien** (cela peut arriver dans certains navigateurs), utilisez **Ouvrir dans Google Sheets**, puis **Fichier → Télécharger → Microsoft Excel**.
- Le bandeau gris de Google en haut de la page (« Cette application a été créée par un utilisateur de Google Apps Script ») est normal.
- **Ne modifiez pas l'onglet « Pointages » à la main** dans le Google Sheet : passez par l'espace gérant. Les autres onglets se lisent sans problème.
- **Gardez l'URL de l'application pour vous** : sans code, personne ne peut pointer, et sans mot de passe personne ne peut entrer dans l'espace gérant.
- **Mettre à jour le programme plus tard** : collez les nouveaux fichiers, puis **Déployer → Gérer les déploiements → ✏️ → Version : Nouvelle version → Déployer**. L'URL ne change pas.
- **Côté légal** : informez les salariés par écrit de la mise en place du pointage et de son but (calcul du temps de travail et de la paie). Conservez les relevés au moins 1 an.

## Essayer sans rien installer
Ouvrez le fichier **`demo.html`** dans un navigateur. C'est une version de démonstration, avec de fausses données :
- codes salariés 1111, 2222… jusqu'à 8888 ;
- mot de passe gérant `maestro`.
