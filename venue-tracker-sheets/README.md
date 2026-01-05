# 🎵 Suivi des Lieux — Release Party Shorty7G & Friends

> Outil interne de l'association **100sations** pour gérer le repérage et l'évaluation des salles.  
> **100% gratuit** : Google Sheets comme backend + GitHub Pages pour le front.

![Google Sheets](https://img.shields.io/badge/Backend-Google%20Sheets-34A853)
![GitHub Pages](https://img.shields.io/badge/Frontend-GitHub%20Pages-181717)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 📋 Fonctionnalités

### 🏛️ Gestion des salles (Admin)
- Ajouter / Modifier / Supprimer des salles
- Infos complètes : capacité, contacts, prix, technique, contraintes...
- Statuts : À contacter → En discussion → Option → Confirmé / Refus
- Images avec avatars générés automatiquement

### 📝 Évaluations (Équipe)
- Formulaire de visite avec signature
- Notes détaillées (1-10) : Global, Technique, Accueil, Accès, Concert→Club, Prix
- Champs structurés : Points forts/faibles, Prix observé, Disponibilités, Contraintes
- Historique et moyennes calculées automatiquement

### 🔒 Séparation des responsabilités
- **Admin** : Peut créer/modifier/supprimer les salles (code requis)
- **Équipe** : Peut uniquement ajouter des évaluations (pas besoin de code)

---

## 🚀 Installation complète (15 minutes)

### Étape 1 : Créer le Google Sheet

1. Aller sur [Google Sheets](https://sheets.google.com)
2. Créer une nouvelle feuille
3. Renommer la feuille en **"Suivi Lieux 100sations"**

### Étape 2 : Créer les onglets

**Onglet 1 : `venues`** (renommer "Feuille 1")

Copier ces en-têtes dans la ligne 1 :
```
id	nom	ville_quartier	adresse	lien_maps	site_web	contact_nom	contact_role	contact_email	contact_tel	capacite_debout	capacite_assise	type	concert_vers_club	prix_conditions	dates_possibles	technique_incluse	contraintes	acces	statut	image_url	created_at	created_by	updated_at
```

**Onglet 2 : `reviews`** (créer un nouvel onglet)

Copier ces en-têtes dans la ligne 1 :
```
id	venue_id	visit_date	visite_par	note_globale	note_technique	note_accueil	note_acces	note_concert_vers_club	note_prix_valeur	prix_observe	disponibilites_observees	contraintes_observees	points_forts	points_faibles_risques	prochaine_action	photos_urls	created_at
```

### Étape 3 : Ajouter les validations (optionnel mais recommandé)

Dans l'onglet `venues` :
- **Colonne M (type)** : Données > Validation > Liste : `concert,club,hybride`
- **Colonne N (concert_vers_club)** : Liste : `oui,non,incertain`
- **Colonne T (statut)** : Liste : `A_contacter,En_discussion,Option,Refus,Confirme`

Dans l'onglet `reviews` :
- **Colonnes E-J (notes)** : Données > Validation > Nombre entre 1 et 10

### Étape 4 : Créer le script Apps Script

1. Dans Google Sheets : **Extensions > Apps Script**
2. Supprimer le code existant
3. Copier-coller tout le contenu de `Code.gs`
4. **Sauvegarder** (Ctrl+S)

### Étape 5 : Initialiser le projet

1. Dans Apps Script, sélectionner la fonction `initSheets` dans le menu déroulant
2. Cliquer sur **▶ Exécuter**
3. Autoriser les permissions Google
4. Répéter avec `initAdminCode` pour définir le code admin
5. (Optionnel) Exécuter `seedData` pour ajouter des données exemple

### Étape 6 : Déployer l'API

1. Cliquer sur **Déployer > Nouveau déploiement**
2. Type : **Application Web**
3. Description : "API Suivi Lieux v1"
4. Exécuter en tant que : **Moi**
5. Accès : **Tout le monde** (ou "Tout le monde avec un compte Google")
6. Cliquer sur **Déployer**
7. **Copier l'URL** qui finit par `/exec`

> ⚠️ **Important** : L'URL `/exec` est l'URL de production. L'URL `/dev` est pour les tests.

### Étape 7 : Configurer le frontend

1. Ouvrir `docs/app.js`
2. Remplacer la ligne :
   ```javascript
   const API_BASE = 'COLLE_ICI_TON_URL_APPS_SCRIPT';
   ```
   Par votre URL `/exec` :
   ```javascript
   const API_BASE = 'https://script.google.com/macros/s/VOTRE_ID/exec';
   ```

### Étape 8 : Déployer sur GitHub Pages

1. Créer un nouveau repo GitHub
2. Uploader tout le contenu du dossier `docs/` à la racine (ou dans `/docs`)
3. Aller dans **Settings > Pages**
4. Source : Deploy from branch
5. Branch : `main` (ou `master`)
6. Folder : `/ (root)` ou `/docs`
7. Cliquer sur **Save**
8. Attendre ~1 minute, votre site est live !

---

## 🔧 Configuration

### Changer le code admin

1. Dans Apps Script, exécuter dans la console :
   ```javascript
   setAdminCode('votre_nouveau_code')
   ```
2. Ou modifier directement `initAdminCode()` et ré-exécuter

### Code admin par défaut
```
100sations2025
```
⚠️ **Changez-le immédiatement en production !**

---

## 📡 API Endpoints

### GET (lecture)

| Action | Paramètres | Description |
|--------|------------|-------------|
| `health` | - | Test de connexion |
| `listVenues` | `statut`, `ville`, `capaciteMin` | Liste des salles + stats |
| `getVenue` | `id` | Détail salle + reviews |
| `listReviews` | `venueId` | Reviews d'une salle |

Exemple :
```
https://script.google.com/.../exec?action=listVenues&statut=En_discussion
```

### POST (écriture)

| Action | Données | Auth |
|--------|---------|------|
| `addVenue` | Toutes les infos salle | Admin |
| `updateVenue` | `id` + champs à modifier | Admin |
| `deleteVenue` | `id` | Admin |
| `addReview` | Toutes les infos review | Public |

Les actions admin nécessitent `adminCode` dans le body.

---

## 📁 Structure du projet

```
venue-tracker-sheets/
├── Code.gs              # Backend Apps Script (à coller dans Google)
├── README.md            # Ce fichier
└── docs/                # Frontend (pour GitHub Pages)
    ├── index.html       # Page principale
    ├── styles.css       # Styles
    └── app.js           # Application JavaScript
```

---

## 🎯 Workflow type

1. **Admin** ajoute une salle potentielle avec statut "À contacter"
2. **Membre** visite la salle et remplit une évaluation
3. **Admin** met à jour le statut → "En discussion"
4. **Autre membre** fait une 2e visite pour confirmer
5. **Admin** met à jour → "Option" puis "Confirmé"

---

## ⚠️ Limites et bonnes pratiques

### Quotas Google Apps Script
- 20 000 appels/jour (compte gratuit)
- 6 min max par exécution
- Largement suffisant pour une petite équipe

### Performances
- JSONP utilisé comme fallback si CORS bloque
- Données en cache côté client pendant la session
- Éviter de recharger inutilement

### Images
- Pas d'upload direct (limites Google)
- Utiliser des URLs externes (Google Drive, Imgur, etc.)
- Pour Google Drive : partager en public et utiliser le lien direct

---

## 🔄 Mises à jour de l'API

Après modification du `Code.gs` :
1. Aller dans Apps Script
2. **Déployer > Gérer les déploiements**
3. Cliquer sur le crayon ✏️
4. Version : **Nouvelle version**
5. **Déployer**

L'URL `/exec` reste la même.

---

## 🐛 Dépannage

### "Erreur de chargement"
- Vérifier que l'URL API_BASE est correcte
- Vérifier que le déploiement est bien "Tout le monde"
- Ouvrir la console (F12) pour voir les erreurs détaillées

### "Code admin invalide"
- Le code est sensible à la casse
- Vérifier dans Apps Script avec `Logger.log(initAdminCode())`

### Les données ne s'affichent pas
- Vérifier les noms des onglets (`venues` et `reviews` exactement)
- Vérifier que les en-têtes sont en ligne 1

---

## 📄 License

MIT © 100sations

---

Made with ❤️ by **100sations** for the Release Party Shorty7G & Friends
