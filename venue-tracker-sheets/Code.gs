/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SUIVI DES LIEUX - Release Party Shorty7G & Friends
 * Backend Google Apps Script
 * Association 100sations
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * INSTALLATION:
 * 1. Créer un Google Sheet avec 2 onglets: "venues" et "reviews"
 * 2. Ouvrir Extensions > Apps Script
 * 3. Coller ce code dans Code.gs
 * 4. Exécuter initAdminCode() une première fois pour définir le code admin
 * 5. Déployer: Déployer > Nouveau déploiement > Application Web
 *    - Exécuter en tant que: Moi
 *    - Accès: Tout le monde
 * 6. Copier l'URL /exec dans le front
 */

// ============================================
// CONFIGURATION
// ============================================

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const VENUES_SHEET = 'venues';
const REVIEWS_SHEET = 'reviews';

// ============================================
// HELPERS
// ============================================

/**
 * Génère une réponse JSON (ou JSONP si callback présent)
 */
function jsonResponse(data, callback) {
  const jsonStr = JSON.stringify(data);
  
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + jsonStr + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  return ContentService.createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Réponse succès
 */
function success(data, callback) {
  return jsonResponse({ ok: true, data: data }, callback);
}

/**
 * Réponse erreur
 */
function error(message, callback) {
  return jsonResponse({ ok: false, error: message }, callback);
}

/**
 * Génère un ID unique
 */
function generateId() {
  return Utilities.getUuid();
}

/**
 * Date ISO actuelle
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * Récupère une feuille par nom
 */
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name);
}

/**
 * Lit toutes les données d'une feuille en tableau d'objets
 */
function sheetToObjects(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map((row, index) => {
    const obj = { _rowIndex: index + 2 }; // +2 car headers + 1-indexed
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  }).filter(obj => obj.id); // Ignorer les lignes vides
}

/**
 * Récupère les headers d'une feuille
 */
function getHeaders(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) return [];
  const data = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues();
  return data[0];
}

/**
 * Ajoute une ligne à une feuille
 */
function appendRow(sheetName, obj) {
  const sheet = getSheet(sheetName);
  const headers = getHeaders(sheetName);
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.appendRow(row);
  return obj;
}

/**
 * Met à jour une ligne existante
 */
function updateRow(sheetName, rowIndex, obj) {
  const sheet = getSheet(sheetName);
  const headers = getHeaders(sheetName);
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  return obj;
}

/**
 * Supprime une ligne
 */
function deleteRow(sheetName, rowIndex) {
  const sheet = getSheet(sheetName);
  sheet.deleteRow(rowIndex);
}

/**
 * Trouve un objet par ID
 */
function findById(sheetName, id) {
  const objects = sheetToObjects(sheetName);
  return objects.find(obj => obj.id === id);
}

/**
 * Vérifie le code admin
 */
function checkAdminCode(code) {
  const stored = PropertiesService.getScriptProperties().getProperty('ADMIN_CODE');
  return stored && code === stored;
}

// ============================================
// INITIALISATION ADMIN (à exécuter une fois)
// ============================================

/**
 * Initialise le code admin. À exécuter manuellement une première fois.
 * Après exécution, noter le code affiché dans les logs.
 */
function initAdminCode() {
  const props = PropertiesService.getScriptProperties();
  let code = props.getProperty('ADMIN_CODE');
  
  if (!code) {
    // Générer un nouveau code ou utiliser celui-ci
    code = '100sations2025'; // CHANGEZ CE CODE !
    props.setProperty('ADMIN_CODE', code);
    Logger.log('Code admin initialisé: ' + code);
  } else {
    Logger.log('Code admin existant: ' + code);
  }
  
  return code;
}

/**
 * Change le code admin (à exécuter manuellement si besoin)
 */
function setAdminCode(newCode) {
  if (!newCode || newCode.length < 6) {
    throw new Error('Le code doit faire au moins 6 caractères');
  }
  PropertiesService.getScriptProperties().setProperty('ADMIN_CODE', newCode);
  Logger.log('Nouveau code admin défini: ' + newCode);
}

// ============================================
// INITIALISATION SHEET (à exécuter une fois)
// ============================================

/**
 * Crée les onglets avec les bons headers si ils n'existent pas
 */
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Headers venues
  const venuesHeaders = [
    'id', 'nom', 'ville_quartier', 'adresse', 'lien_maps', 'site_web',
    'contact_nom', 'contact_role', 'contact_email', 'contact_tel',
    'capacite_debout', 'capacite_assise', 'type', 'concert_vers_club',
    'prix_conditions', 'dates_possibles', 'technique_incluse', 'contraintes',
    'acces', 'statut', 'image_url', 'created_at', 'created_by', 'updated_at'
  ];
  
  // Headers reviews
  const reviewsHeaders = [
    'id', 'venue_id', 'visit_date', 'visite_par', 'note_globale',
    'note_technique', 'note_accueil', 'note_acces', 'note_concert_vers_club',
    'note_prix_valeur', 'prix_observe', 'disponibilites_observees',
    'contraintes_observees', 'points_forts', 'points_faibles_risques',
    'prochaine_action', 'photos_urls', 'created_at'
  ];
  
  // Créer onglet venues
  let venuesSheet = ss.getSheetByName(VENUES_SHEET);
  if (!venuesSheet) {
    venuesSheet = ss.insertSheet(VENUES_SHEET);
    venuesSheet.getRange(1, 1, 1, venuesHeaders.length).setValues([venuesHeaders]);
    venuesSheet.getRange(1, 1, 1, venuesHeaders.length).setFontWeight('bold');
    Logger.log('Onglet "venues" créé');
  }
  
  // Créer onglet reviews
  let reviewsSheet = ss.getSheetByName(REVIEWS_SHEET);
  if (!reviewsSheet) {
    reviewsSheet = ss.insertSheet(REVIEWS_SHEET);
    reviewsSheet.getRange(1, 1, 1, reviewsHeaders.length).setValues([reviewsHeaders]);
    reviewsSheet.getRange(1, 1, 1, reviewsHeaders.length).setFontWeight('bold');
    Logger.log('Onglet "reviews" créé');
  }
  
  Logger.log('Initialisation terminée !');
}

/**
 * Ajoute des données exemple
 */
function seedData() {
  const now = nowISO();
  
  // Venues exemple
  const venues = [
    {
      id: generateId(),
      nom: 'Le Groove',
      ville_quartier: 'Genève - Pâquis',
      adresse: 'Rue de la Navigation 24, 1201 Genève',
      lien_maps: 'https://maps.google.com/?q=Le+Groove+Geneve',
      site_web: 'https://legroove.ch',
      contact_nom: 'Marco',
      contact_role: 'Responsable booking',
      contact_email: 'booking@legroove.ch',
      contact_tel: '+41 22 732 00 00',
      capacite_debout: 180,
      capacite_assise: 80,
      type: 'hybride',
      concert_vers_club: 'oui',
      prix_conditions: 'Location ~1500 CHF + bar / Ou % sur entrées (négociable)',
      dates_possibles: 'Jeudi-Samedi, vérifier dispo septembre',
      technique_incluse: 'Console son incluse, lumières basiques, pas de backline',
      contraintes: 'Fermeture 4h, voisinage sensible au bruit',
      acces: 'Escaliers, pas d\'ascenseur, parking à 200m',
      statut: 'En_discussion',
      image_url: '',
      created_at: now,
      created_by: 'Luca',
      updated_at: now
    },
    {
      id: generateId(),
      nom: 'La Julienne',
      ville_quartier: 'Plan-les-Ouates',
      adresse: 'Route de Saint-Julien 116, 1228 Plan-les-Ouates',
      lien_maps: 'https://maps.google.com/?q=La+Julienne+Plan-les-Ouates',
      site_web: 'https://lajulienne.ch',
      contact_nom: 'Direction technique',
      contact_role: 'Technique',
      contact_email: 'technique@lajulienne.ch',
      contact_tel: '+41 22 884 88 00',
      capacite_debout: 350,
      capacite_assise: 200,
      type: 'concert',
      concert_vers_club: 'incertain',
      prix_conditions: 'À définir selon formule (location ou coprod)',
      dates_possibles: 'Disponible WE, vérifier agenda culturel',
      technique_incluse: 'Son et lumière pro, backline possible, régie',
      contraintes: 'Commune, procédures administratives',
      acces: 'Parking gratuit, accès PMR, transports OK',
      statut: 'Option',
      image_url: '',
      created_at: now,
      created_by: 'Luca',
      updated_at: now
    },
    {
      id: generateId(),
      nom: 'L\'Usine (PTR)',
      ville_quartier: 'Genève - Jonction',
      adresse: 'Place des Volontaires 4, 1204 Genève',
      lien_maps: 'https://maps.google.com/?q=Usine+Geneve',
      site_web: 'https://usine.ch',
      contact_nom: 'Collectif PTR',
      contact_role: 'Programmation',
      contact_email: 'ptr@usine.ch',
      contact_tel: '',
      capacite_debout: 500,
      capacite_assise: 0,
      type: 'concert',
      concert_vers_club: 'oui',
      prix_conditions: 'Formule associative, % sur entrées',
      dates_possibles: 'Selon programmation, anticiper 3 mois',
      technique_incluse: 'Son et lumière pro, ingé son sur place',
      contraintes: 'Gestion collective, délais de réponse longs',
      acces: 'Transports publics, pas de parking',
      statut: 'A_contacter',
      image_url: '',
      created_at: now,
      created_by: 'Gide',
      updated_at: now
    }
  ];
  
  venues.forEach(v => appendRow(VENUES_SHEET, v));
  
  // Récupérer les IDs des venues créées
  const createdVenues = sheetToObjects(VENUES_SHEET);
  
  // Reviews exemple
  const reviews = [
    {
      id: generateId(),
      venue_id: createdVenues[0].id, // Le Groove
      visit_date: '2025-01-10',
      visite_par: 'Gide',
      note_globale: 8,
      note_technique: 7,
      note_accueil: 9,
      note_acces: 5,
      note_concert_vers_club: 9,
      note_prix_valeur: 7,
      prix_observe: '1200-1800 CHF selon formule',
      disponibilites_observees: 'Septembre OK sauf 2e weekend',
      contraintes_observees: 'Fin de soirée 4h max strict, escaliers problématiques',
      points_forts: 'Ambiance intime, équipe sympa, bon son pour la taille, habitués hip-hop',
      points_faibles_risques: 'Escaliers pas pratiques, capacité limitée, voisinage sensible',
      prochaine_action: 'Envoyer proposition détaillée par email',
      photos_urls: '',
      created_at: now
    },
    {
      id: generateId(),
      venue_id: createdVenues[1].id, // La Julienne
      visit_date: '2025-01-05',
      visite_par: 'Luca',
      note_globale: 9,
      note_technique: 10,
      note_accueil: 8,
      note_acces: 9,
      note_concert_vers_club: 7,
      note_prix_valeur: 8,
      prix_observe: 'À négocier (relation existante)',
      disponibilites_observees: 'WE septembre dispo, confirmer vite',
      contraintes_observees: 'Délais admin commune, anticiper 2 mois',
      points_forts: 'Technique pro, espace, parking, accès PMR, on connaît déjà',
      points_faibles_risques: 'Moins festif/club que Le Groove, procédures commune',
      prochaine_action: 'Contacter direction pour poser option',
      photos_urls: '',
      created_at: now
    },
    {
      id: generateId(),
      venue_id: createdVenues[0].id, // Le Groove (2e review)
      visit_date: '2025-01-15',
      visite_par: 'Luca',
      note_globale: 8,
      note_technique: 8,
      note_accueil: 9,
      note_acces: 5,
      note_concert_vers_club: 9,
      note_prix_valeur: 7,
      prix_observe: '1500 CHF fixe proposé',
      disponibilites_observees: '20 ou 27 septembre OK',
      contraintes_observees: 'Besoin de backline externe',
      points_forts: 'Marco très réactif, prêt à négocier, ambiance parfaite',
      points_faibles_risques: 'Jauge peut être juste si beaucoup de monde',
      prochaine_action: 'Confirmer date et envoyer rider technique',
      photos_urls: '',
      created_at: now
    }
  ];
  
  reviews.forEach(r => appendRow(REVIEWS_SHEET, r));
  
  Logger.log('Données exemple ajoutées !');
}

// ============================================
// API - ROUTES GET
// ============================================

function doGet(e) {
  const params = e.parameter || {};
  const action = params.action || 'health';
  const callback = params.callback; // Pour JSONP
  
  try {
    switch (action) {
      case 'health':
        return success({ status: 'ok', timestamp: nowISO() }, callback);
      
      case 'listVenues':
        return handleListVenues(params, callback);
      
      case 'getVenue':
        return handleGetVenue(params, callback);
      
      case 'listReviews':
        return handleListReviews(params, callback);
      
      default:
        return error('Action non reconnue: ' + action, callback);
    }
  } catch (err) {
    return error(err.message, callback);
  }
}

/**
 * Liste toutes les venues avec stats
 */
function handleListVenues(params, callback) {
  const venues = sheetToObjects(VENUES_SHEET);
  const reviews = sheetToObjects(REVIEWS_SHEET);
  
  // Calculer stats pour chaque venue
  const venuesWithStats = venues.map(venue => {
    const venueReviews = reviews.filter(r => r.venue_id === venue.id);
    const avgNote = venueReviews.length > 0
      ? venueReviews.reduce((sum, r) => sum + Number(r.note_globale), 0) / venueReviews.length
      : null;
    const lastVisit = venueReviews.length > 0
      ? venueReviews.sort((a, b) => b.visit_date.localeCompare(a.visit_date))[0].visit_date
      : null;
    
    return {
      ...venue,
      _stats: {
        nb_reviews: venueReviews.length,
        avg_note_globale: avgNote ? Math.round(avgNote * 10) / 10 : null,
        last_visit_date: lastVisit
      }
    };
  });
  
  // Filtres optionnels
  let filtered = venuesWithStats;
  
  if (params.statut) {
    filtered = filtered.filter(v => v.statut === params.statut);
  }
  
  if (params.ville) {
    const ville = params.ville.toLowerCase();
    filtered = filtered.filter(v => v.ville_quartier.toLowerCase().includes(ville));
  }
  
  if (params.capaciteMin) {
    const min = parseInt(params.capaciteMin);
    filtered = filtered.filter(v => v.capacite_debout >= min);
  }
  
  // Tri par défaut: dernière mise à jour desc
  filtered.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  
  return success(filtered, callback);
}

/**
 * Détail d'une venue avec reviews
 */
function handleGetVenue(params, callback) {
  const id = params.id;
  if (!id) return error('ID requis', callback);
  
  const venue = findById(VENUES_SHEET, id);
  if (!venue) return error('Salle non trouvée', callback);
  
  // Récupérer reviews
  const allReviews = sheetToObjects(REVIEWS_SHEET);
  const venueReviews = allReviews
    .filter(r => r.venue_id === id)
    .sort((a, b) => b.visit_date.localeCompare(a.visit_date))
    .slice(0, 20);
  
  // Stats
  const avgNote = venueReviews.length > 0
    ? venueReviews.reduce((sum, r) => sum + Number(r.note_globale), 0) / venueReviews.length
    : null;
  
  // Moyennes par catégorie
  const avgNotes = {};
  if (venueReviews.length > 0) {
    ['note_technique', 'note_accueil', 'note_acces', 'note_concert_vers_club', 'note_prix_valeur'].forEach(key => {
      const values = venueReviews.map(r => Number(r[key])).filter(n => !isNaN(n) && n > 0);
      avgNotes[key] = values.length > 0
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10
        : null;
    });
  }
  
  return success({
    venue: venue,
    reviews: venueReviews,
    stats: {
      nb_reviews: venueReviews.length,
      avg_note_globale: avgNote ? Math.round(avgNote * 10) / 10 : null,
      avg_notes: avgNotes,
      last_visit_date: venueReviews[0]?.visit_date || null
    }
  }, callback);
}

/**
 * Liste toutes les reviews d'une venue
 */
function handleListReviews(params, callback) {
  const venueId = params.venueId;
  if (!venueId) return error('venueId requis', callback);
  
  const allReviews = sheetToObjects(REVIEWS_SHEET);
  const reviews = allReviews
    .filter(r => r.venue_id === venueId)
    .sort((a, b) => b.visit_date.localeCompare(a.visit_date));
  
  return success(reviews, callback);
}

// ============================================
// API - ROUTES POST
// ============================================

function doPost(e) {
  let params = {};
  let body = {};
  
  try {
    // Parser les paramètres
    params = e.parameter || {};
    
    // Parser le body JSON si présent
    if (e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        // Si pas JSON, essayer form data
        body = params;
      }
    }
    
    // Merger params et body
    const data = { ...params, ...body };
    const action = data.action;
    
    switch (action) {
      // Actions admin
      case 'addVenue':
        return handleAddVenue(data);
      
      case 'updateVenue':
        return handleUpdateVenue(data);
      
      case 'deleteVenue':
        return handleDeleteVenue(data);
      
      // Actions publiques
      case 'addReview':
        return handleAddReview(data);
      
      default:
        return error('Action POST non reconnue: ' + action);
    }
  } catch (err) {
    return error(err.message);
  }
}

/**
 * Ajoute une venue (admin)
 */
function handleAddVenue(data) {
  // Vérifier admin
  if (!checkAdminCode(data.adminCode)) {
    return error('Code admin invalide');
  }
  
  // Valider champs requis
  if (!data.nom || !data.ville_quartier) {
    return error('Nom et ville/quartier sont requis');
  }
  
  // Valider type
  const validTypes = ['concert', 'club', 'hybride'];
  if (data.type && !validTypes.includes(data.type)) {
    return error('Type invalide. Valeurs acceptées: ' + validTypes.join(', '));
  }
  
  // Valider statut
  const validStatuts = ['A_contacter', 'En_discussion', 'Option', 'Refus', 'Confirme'];
  if (data.statut && !validStatuts.includes(data.statut)) {
    return error('Statut invalide. Valeurs acceptées: ' + validStatuts.join(', '));
  }
  
  const now = nowISO();
  const venue = {
    id: generateId(),
    nom: data.nom,
    ville_quartier: data.ville_quartier,
    adresse: data.adresse || '',
    lien_maps: data.lien_maps || '',
    site_web: data.site_web || '',
    contact_nom: data.contact_nom || '',
    contact_role: data.contact_role || '',
    contact_email: data.contact_email || '',
    contact_tel: data.contact_tel || '',
    capacite_debout: data.capacite_debout ? parseInt(data.capacite_debout) : 0,
    capacite_assise: data.capacite_assise ? parseInt(data.capacite_assise) : 0,
    type: data.type || 'hybride',
    concert_vers_club: data.concert_vers_club || 'incertain',
    prix_conditions: data.prix_conditions || '',
    dates_possibles: data.dates_possibles || '',
    technique_incluse: data.technique_incluse || '',
    contraintes: data.contraintes || '',
    acces: data.acces || '',
    statut: data.statut || 'A_contacter',
    image_url: data.image_url || '',
    created_at: now,
    created_by: data.created_by || 'Admin',
    updated_at: now
  };
  
  appendRow(VENUES_SHEET, venue);
  return success(venue);
}

/**
 * Met à jour une venue (admin)
 */
function handleUpdateVenue(data) {
  // Vérifier admin
  if (!checkAdminCode(data.adminCode)) {
    return error('Code admin invalide');
  }
  
  if (!data.id) {
    return error('ID requis');
  }
  
  // Trouver la venue existante
  const existing = findById(VENUES_SHEET, data.id);
  if (!existing) {
    return error('Salle non trouvée');
  }
  
  // Valider type si fourni
  const validTypes = ['concert', 'club', 'hybride'];
  if (data.type && !validTypes.includes(data.type)) {
    return error('Type invalide');
  }
  
  // Valider statut si fourni
  const validStatuts = ['A_contacter', 'En_discussion', 'Option', 'Refus', 'Confirme'];
  if (data.statut && !validStatuts.includes(data.statut)) {
    return error('Statut invalide');
  }
  
  // Mettre à jour les champs
  const updated = {
    ...existing,
    nom: data.nom !== undefined ? data.nom : existing.nom,
    ville_quartier: data.ville_quartier !== undefined ? data.ville_quartier : existing.ville_quartier,
    adresse: data.adresse !== undefined ? data.adresse : existing.adresse,
    lien_maps: data.lien_maps !== undefined ? data.lien_maps : existing.lien_maps,
    site_web: data.site_web !== undefined ? data.site_web : existing.site_web,
    contact_nom: data.contact_nom !== undefined ? data.contact_nom : existing.contact_nom,
    contact_role: data.contact_role !== undefined ? data.contact_role : existing.contact_role,
    contact_email: data.contact_email !== undefined ? data.contact_email : existing.contact_email,
    contact_tel: data.contact_tel !== undefined ? data.contact_tel : existing.contact_tel,
    capacite_debout: data.capacite_debout !== undefined ? parseInt(data.capacite_debout) : existing.capacite_debout,
    capacite_assise: data.capacite_assise !== undefined ? parseInt(data.capacite_assise) : existing.capacite_assise,
    type: data.type !== undefined ? data.type : existing.type,
    concert_vers_club: data.concert_vers_club !== undefined ? data.concert_vers_club : existing.concert_vers_club,
    prix_conditions: data.prix_conditions !== undefined ? data.prix_conditions : existing.prix_conditions,
    dates_possibles: data.dates_possibles !== undefined ? data.dates_possibles : existing.dates_possibles,
    technique_incluse: data.technique_incluse !== undefined ? data.technique_incluse : existing.technique_incluse,
    contraintes: data.contraintes !== undefined ? data.contraintes : existing.contraintes,
    acces: data.acces !== undefined ? data.acces : existing.acces,
    statut: data.statut !== undefined ? data.statut : existing.statut,
    image_url: data.image_url !== undefined ? data.image_url : existing.image_url,
    updated_at: nowISO()
  };
  
  updateRow(VENUES_SHEET, existing._rowIndex, updated);
  return success(updated);
}

/**
 * Supprime une venue (admin)
 */
function handleDeleteVenue(data) {
  // Vérifier admin
  if (!checkAdminCode(data.adminCode)) {
    return error('Code admin invalide');
  }
  
  if (!data.id) {
    return error('ID requis');
  }
  
  const existing = findById(VENUES_SHEET, data.id);
  if (!existing) {
    return error('Salle non trouvée');
  }
  
  deleteRow(VENUES_SHEET, existing._rowIndex);
  return success({ deleted: true, id: data.id });
}

/**
 * Ajoute une review (public)
 */
function handleAddReview(data) {
  // Valider champs requis
  if (!data.venue_id) {
    return error('venue_id requis');
  }
  
  if (!data.visite_par || data.visite_par.trim() === '') {
    return error('visite_par requis (votre nom/signature)');
  }
  
  if (!data.visit_date) {
    return error('visit_date requis');
  }
  
  if (!data.note_globale || data.note_globale < 1 || data.note_globale > 10) {
    return error('note_globale requis (1-10)');
  }
  
  // Vérifier que la venue existe
  const venue = findById(VENUES_SHEET, data.venue_id);
  if (!venue) {
    return error('Salle non trouvée');
  }
  
  // Valider les notes (1-10)
  const noteFields = ['note_globale', 'note_technique', 'note_accueil', 'note_acces', 'note_concert_vers_club', 'note_prix_valeur'];
  for (const field of noteFields) {
    if (data[field] !== undefined && data[field] !== '') {
      const note = parseInt(data[field]);
      if (isNaN(note) || note < 1 || note > 10) {
        return error(field + ' doit être entre 1 et 10');
      }
    }
  }
  
  const review = {
    id: generateId(),
    venue_id: data.venue_id,
    visit_date: data.visit_date,
    visite_par: data.visite_par.trim(),
    note_globale: parseInt(data.note_globale),
    note_technique: data.note_technique ? parseInt(data.note_technique) : '',
    note_accueil: data.note_accueil ? parseInt(data.note_accueil) : '',
    note_acces: data.note_acces ? parseInt(data.note_acces) : '',
    note_concert_vers_club: data.note_concert_vers_club ? parseInt(data.note_concert_vers_club) : '',
    note_prix_valeur: data.note_prix_valeur ? parseInt(data.note_prix_valeur) : '',
    prix_observe: data.prix_observe || '',
    disponibilites_observees: data.disponibilites_observees || '',
    contraintes_observees: data.contraintes_observees || '',
    points_forts: data.points_forts || '',
    points_faibles_risques: data.points_faibles_risques || '',
    prochaine_action: data.prochaine_action || '',
    photos_urls: data.photos_urls || '',
    created_at: nowISO()
  };
  
  appendRow(REVIEWS_SHEET, review);
  return success(review);
}
