/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SUIVI DES LIEUX - Release Party Shorty7G & Friends
 * Frontend JavaScript
 * Association 100sations
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ============================================
// CONFIGURATION
// ============================================

// ⚠️ REMPLACEZ CETTE URL PAR VOTRE URL /exec APPS SCRIPT ⚠️
const API_BASE = 'https://script.google.com/macros/s/AKfycbz_W7JsJTMW17CO1ZThG9Hc37xLUDX2DUEZKXEjB5uWHw-ZfMEIqQRBFGjEXSzlIq_1/exec';

// ============================================
// GLOBAL STATE
// ============================================

const state = {
  venues: [],
  currentVenue: null,
  venueToDelete: null,
  adminCode: localStorage.getItem('adminCode') || '',
  isAdmin: false
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Toast notifications
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Format date
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Get initials from name
 */
function getInitials(name) {
  if (!name) return '??';
  return name.split(/[\s-]+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Status labels
 */
const statusLabels = {
  'A_contacter': 'À contacter',
  'En_discussion': 'En discussion',
  'Option': 'Option',
  'Refus': 'Refus',
  'Confirme': 'Confirmé'
};

/**
 * Type labels
 */
const typeLabels = {
  'concert': 'Concert',
  'club': 'Club',
  'hybride': 'Hybride'
};

/**
 * Debounce utility
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * JSONP request (for GET requests to bypass CORS)
 */
function jsonpRequest(url) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    const script = document.createElement('script');
    
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Request timeout'));
    }, 30000);
    
    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }
    
    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };
    
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
    script.onerror = () => {
      cleanup();
      reject(new Error('Script load error'));
    };
    
    document.body.appendChild(script);
  });
}

/**
 * API GET request (tries fetch, falls back to JSONP)
 */
async function apiGet(action, params = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  
  try {
    // Try fetch first
    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.error || 'Erreur API');
    }
    return data.data;
  } catch (fetchError) {
    // Fall back to JSONP if fetch fails (CORS issues)
    console.log('Fetch failed, trying JSONP...', fetchError.message);
    try {
      const data = await jsonpRequest(url.toString());
      if (!data.ok) {
        throw new Error(data.error || 'Erreur API');
      }
      return data.data;
    } catch (jsonpError) {
      console.error('JSONP also failed:', jsonpError);
      throw jsonpError;
    }
  }
}

/**
 * API POST request
 */
async function apiPost(action, body = {}) {
  const url = new URL(API_BASE);
  
  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...body }),
      mode: 'cors'
    });
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.error || 'Erreur API');
    }
    return data.data;
  } catch (error) {
    // If POST fails due to CORS, try GET with encoded params (fallback)
    console.log('POST failed, trying GET fallback...', error.message);
    
    // For addReview, we can try JSONP with GET
    const params = { action, ...body };
    return apiGet(action, params);
  }
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

/**
 * Render venue card
 */
function renderVenueCard(venue) {
  const card = document.createElement('div');
  card.className = 'venue-card';
  card.dataset.id = venue.id;
  
  const imageHtml = venue.image_url 
    ? `<img src="${venue.image_url}" alt="${venue.nom}" class="venue-card-image" onerror="this.outerHTML='<div class=\\'venue-card-avatar\\'>${getInitials(venue.nom)}</div>'">`
    : `<div class="venue-card-avatar">${getInitials(venue.nom)}</div>`;
  
  const stats = venue._stats || {};
  const scoreHtml = stats.avg_note_globale 
    ? `<span class="venue-card-score">⭐ ${stats.avg_note_globale.toFixed(1)}</span>`
    : '';
  
  const reviewsHtml = stats.nb_reviews 
    ? `<span class="venue-card-reviews">${stats.nb_reviews} avis</span>`
    : '';
  
  card.innerHTML = `
    ${imageHtml}
    <div class="venue-card-body">
      <div class="venue-card-header">
        <h3 class="venue-card-name">${venue.nom}</h3>
        <span class="badge badge-${venue.statut}">${statusLabels[venue.statut] || venue.statut}</span>
      </div>
      <p class="venue-card-location">${venue.ville_quartier}</p>
      <div class="venue-card-meta">
        ${venue.capacite_debout ? `<span class="venue-card-capacity">👥 ${venue.capacite_debout} debout</span>` : ''}
        ${scoreHtml}
        ${reviewsHtml}
      </div>
    </div>
  `;
  
  card.addEventListener('click', () => openVenueDetail(venue.id));
  return card;
}

/**
 * Render venues grid
 */
function renderVenuesGrid(venues) {
  const grid = document.getElementById('venues-grid');
  const loading = document.getElementById('loading-venues');
  const empty = document.getElementById('empty-venues');
  const error = document.getElementById('error-venues');
  
  loading.classList.add('hidden');
  error.classList.add('hidden');
  grid.innerHTML = '';
  
  if (venues.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  
  empty.classList.add('hidden');
  venues.forEach(venue => {
    grid.appendChild(renderVenueCard(venue));
  });
}

/**
 * Render venue detail
 */
function renderVenueDetail(venue, reviews = [], stats = {}) {
  const container = document.getElementById('venue-detail-content');
  
  const imageHtml = venue.image_url 
    ? `<img src="${venue.image_url}" alt="${venue.nom}" class="venue-detail-image" onerror="this.outerHTML='<div class=\\'venue-detail-avatar\\'>${getInitials(venue.nom)}</div>'">`
    : `<div class="venue-detail-avatar">${getInitials(venue.nom)}</div>`;
  
  const avgNotes = stats.avg_notes || {};
  
  const scoresHtml = stats.avg_note_globale ? `
    <div class="venue-detail-scores">
      <div class="score-badge">
        <span class="score-badge-value">${stats.avg_note_globale.toFixed(1)}</span>
        <span class="score-badge-label">Global</span>
      </div>
      ${avgNotes.note_technique ? `<div class="score-badge"><span class="score-badge-value">${avgNotes.note_technique.toFixed(1)}</span><span class="score-badge-label">Technique</span></div>` : ''}
      ${avgNotes.note_accueil ? `<div class="score-badge"><span class="score-badge-value">${avgNotes.note_accueil.toFixed(1)}</span><span class="score-badge-label">Accueil</span></div>` : ''}
      ${avgNotes.note_acces ? `<div class="score-badge"><span class="score-badge-value">${avgNotes.note_acces.toFixed(1)}</span><span class="score-badge-label">Accès</span></div>` : ''}
      ${avgNotes.note_concert_vers_club ? `<div class="score-badge"><span class="score-badge-value">${avgNotes.note_concert_vers_club.toFixed(1)}</span><span class="score-badge-label">Concert→Club</span></div>` : ''}
      ${avgNotes.note_prix_valeur ? `<div class="score-badge"><span class="score-badge-value">${avgNotes.note_prix_valeur.toFixed(1)}</span><span class="score-badge-label">Prix</span></div>` : ''}
    </div>
  ` : '<p class="hint">Aucune évaluation pour le moment.</p>';
  
  const reviewsHtml = reviews.length > 0 
    ? reviews.map(review => renderReviewCard(review)).join('')
    : '<p class="hint">Aucune évaluation pour le moment.</p>';
  
  const adminActionsHtml = state.isAdmin ? `
    <div class="venue-detail-actions admin-only">
      <button class="btn btn-primary" onclick="openEditVenue('${venue.id}')">✏️ Modifier</button>
      <button class="btn btn-danger" onclick="openDeleteConfirm('${venue.id}')">🗑️ Supprimer</button>
    </div>
  ` : '';
  
  container.innerHTML = `
    <div class="venue-detail">
      <div class="venue-detail-header">
        ${imageHtml}
        <div class="venue-detail-info">
          <h2>${venue.nom}</h2>
          <p class="venue-detail-location">
            📍 ${venue.ville_quartier}
            ${venue.adresse ? `<br><small>${venue.adresse}</small>` : ''}
            ${venue.lien_maps ? `<br><a href="${venue.lien_maps}" target="_blank">Voir sur Google Maps →</a>` : ''}
          </p>
          <span class="badge badge-${venue.statut}">${statusLabels[venue.statut] || venue.statut}</span>
          ${scoresHtml}
        </div>
      </div>
      
      <div class="venue-detail-section">
        <h3>Informations générales</h3>
        <div class="venue-detail-grid">
          <div class="venue-detail-item">
            <strong>Type</strong>
            ${typeLabels[venue.type] || venue.type}
          </div>
          <div class="venue-detail-item">
            <strong>Concert → Club</strong>
            ${venue.concert_vers_club === 'oui' ? '✅ Oui' : venue.concert_vers_club === 'non' ? '❌ Non' : '❓ Incertain'}
          </div>
          <div class="venue-detail-item">
            <strong>Capacité debout</strong>
            ${venue.capacite_debout || '-'}
          </div>
          <div class="venue-detail-item">
            <strong>Capacité assise</strong>
            ${venue.capacite_assise || '-'}
          </div>
          ${venue.site_web ? `<div class="venue-detail-item"><strong>Site web</strong><a href="${venue.site_web}" target="_blank">${venue.site_web}</a></div>` : ''}
        </div>
      </div>
      
      ${(venue.contact_nom || venue.contact_email || venue.contact_tel) ? `
        <div class="venue-detail-section">
          <h3>Contact</h3>
          <div class="venue-detail-grid">
            ${venue.contact_nom ? `<div class="venue-detail-item"><strong>Nom</strong>${venue.contact_nom}${venue.contact_role ? ` (${venue.contact_role})` : ''}</div>` : ''}
            ${venue.contact_email ? `<div class="venue-detail-item"><strong>Email</strong><a href="mailto:${venue.contact_email}">${venue.contact_email}</a></div>` : ''}
            ${venue.contact_tel ? `<div class="venue-detail-item"><strong>Téléphone</strong><a href="tel:${venue.contact_tel}">${venue.contact_tel}</a></div>` : ''}
          </div>
        </div>
      ` : ''}
      
      ${(venue.prix_conditions || venue.dates_possibles || venue.technique_incluse || venue.acces || venue.contraintes) ? `
        <div class="venue-detail-section">
          <h3>Détails pratiques</h3>
          <div class="venue-detail-grid">
            ${venue.prix_conditions ? `<div class="venue-detail-item"><strong>Prix / Conditions</strong>${venue.prix_conditions}</div>` : ''}
            ${venue.dates_possibles ? `<div class="venue-detail-item"><strong>Dates possibles</strong>${venue.dates_possibles}</div>` : ''}
            ${venue.technique_incluse ? `<div class="venue-detail-item"><strong>Technique incluse</strong>${venue.technique_incluse}</div>` : ''}
            ${venue.acces ? `<div class="venue-detail-item"><strong>Accès</strong>${venue.acces}</div>` : ''}
            ${venue.contraintes ? `<div class="venue-detail-item"><strong>Contraintes</strong>${venue.contraintes}</div>` : ''}
          </div>
        </div>
      ` : ''}
      
      <div class="venue-detail-section">
        <h3>Évaluations (${reviews.length})</h3>
        ${reviewsHtml}
      </div>
      
      ${adminActionsHtml}
    </div>
  `;
}

/**
 * Render review card
 */
function renderReviewCard(review) {
  // Parse photos URLs
  const photos = review.photos_urls 
    ? review.photos_urls.split(',').map(u => u.trim()).filter(u => u)
    : [];
  
  const photosHtml = photos.length > 0 
    ? `<div class="review-photos">${photos.map(p => `<img src="${p}" alt="Photo" onerror="this.style.display='none'">`).join('')}</div>`
    : '';
  
  return `
    <div class="review-card">
      <div class="review-header">
        <div>
          <span class="review-author">${review.visite_par}</span>
          <span class="review-date">${formatDate(review.visit_date)}</span>
        </div>
        <span class="review-score">${review.note_globale}/10</span>
      </div>
      <div class="review-scores">
        ${review.note_technique ? `<span class="review-score-mini">Tech: ${review.note_technique}/10</span>` : ''}
        ${review.note_accueil ? `<span class="review-score-mini">Accueil: ${review.note_accueil}/10</span>` : ''}
        ${review.note_acces ? `<span class="review-score-mini">Accès: ${review.note_acces}/10</span>` : ''}
        ${review.note_concert_vers_club ? `<span class="review-score-mini">Concert→Club: ${review.note_concert_vers_club}/10</span>` : ''}
        ${review.note_prix_valeur ? `<span class="review-score-mini">Prix: ${review.note_prix_valeur}/10</span>` : ''}
      </div>
      <div class="review-content">
        ${review.points_forts ? `<p><strong>✅ Points forts:</strong> ${review.points_forts}</p>` : ''}
        ${review.points_faibles_risques ? `<p><strong>⚠️ Points faibles:</strong> ${review.points_faibles_risques}</p>` : ''}
        ${review.prix_observe ? `<p><strong>💰 Prix observé:</strong> ${review.prix_observe}</p>` : ''}
        ${review.disponibilites_observees ? `<p><strong>📅 Dispo:</strong> ${review.disponibilites_observees}</p>` : ''}
        ${review.contraintes_observees ? `<p><strong>🚧 Contraintes:</strong> ${review.contraintes_observees}</p>` : ''}
        ${review.prochaine_action ? `<p><strong>➡️ Prochaine action:</strong> ${review.prochaine_action}</p>` : ''}
      </div>
      ${photosHtml}
    </div>
  `;
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
  document.body.style.overflow = '';
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.remove('active');
  });
  document.body.style.overflow = '';
}

async function openVenueDetail(id) {
  try {
    const result = await apiGet('getVenue', { id });
    state.currentVenue = result.venue;
    renderVenueDetail(result.venue, result.reviews, result.stats);
    openModal('modal-venue-detail');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openAddVenue() {
  document.getElementById('venue-form-title').textContent = 'Ajouter une salle';
  document.getElementById('venue-form').reset();
  document.getElementById('venue-id').value = '';
  document.getElementById('venue-image-preview').innerHTML = '';
  openModal('modal-venue-form');
}

async function openEditVenue(id) {
  try {
    const result = await apiGet('getVenue', { id });
    const venue = result.venue;
    
    document.getElementById('venue-form-title').textContent = 'Modifier la salle';
    document.getElementById('venue-id').value = venue.id;
    document.getElementById('venue-nom').value = venue.nom || '';
    document.getElementById('venue-ville').value = venue.ville_quartier || '';
    document.getElementById('venue-adresse').value = venue.adresse || '';
    document.getElementById('venue-maps').value = venue.lien_maps || '';
    document.getElementById('venue-site').value = venue.site_web || '';
    document.getElementById('venue-contact-nom').value = venue.contact_nom || '';
    document.getElementById('venue-contact-role').value = venue.contact_role || '';
    document.getElementById('venue-contact-email').value = venue.contact_email || '';
    document.getElementById('venue-contact-tel').value = venue.contact_tel || '';
    document.getElementById('venue-capacite-debout').value = venue.capacite_debout || '';
    document.getElementById('venue-capacite-assise').value = venue.capacite_assise || '';
    document.getElementById('venue-type').value = venue.type || 'hybride';
    document.getElementById('venue-concert-club').value = venue.concert_vers_club || 'incertain';
    document.getElementById('venue-statut').value = venue.statut || 'A_contacter';
    document.getElementById('venue-prix').value = venue.prix_conditions || '';
    document.getElementById('venue-dates').value = venue.dates_possibles || '';
    document.getElementById('venue-tech').value = venue.technique_incluse || '';
    document.getElementById('venue-acces').value = venue.acces || '';
    document.getElementById('venue-contraintes').value = venue.contraintes || '';
    document.getElementById('venue-image').value = venue.image_url || '';
    document.getElementById('venue-created-by').value = venue.created_by || '';
    
    const preview = document.getElementById('venue-image-preview');
    preview.innerHTML = venue.image_url ? `<img src="${venue.image_url}" alt="Preview">` : '';
    
    closeModal('modal-venue-detail');
    openModal('modal-venue-form');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openDeleteConfirm(id) {
  state.venueToDelete = id;
  closeModal('modal-venue-detail');
  openModal('modal-confirm-delete');
}

// ============================================
// DATA LOADING
// ============================================

async function loadVenues() {
  const loading = document.getElementById('loading-venues');
  const error = document.getElementById('error-venues');
  const grid = document.getElementById('venues-grid');
  
  loading.classList.remove('hidden');
  error.classList.add('hidden');
  grid.innerHTML = '';
  
  try {
    const venues = await apiGet('listVenues');
    state.venues = venues;
    applyFilters();
  } catch (err) {
    console.error('Erreur chargement venues:', err);
    loading.classList.add('hidden');
    error.classList.remove('hidden');
    document.getElementById('error-venues-message').textContent = err.message;
  }
}

function applyFilters() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const statut = document.getElementById('filter-statut').value;
  const capacite = parseInt(document.getElementById('filter-capacite').value) || 0;
  
  let filtered = [...state.venues];
  
  if (search) {
    filtered = filtered.filter(v => 
      v.nom.toLowerCase().includes(search) ||
      v.ville_quartier.toLowerCase().includes(search)
    );
  }
  
  if (statut) {
    filtered = filtered.filter(v => v.statut === statut);
  }
  
  if (capacite) {
    filtered = filtered.filter(v => v.capacite_debout >= capacite);
  }
  
  renderVenuesGrid(filtered);
}

async function loadVenueDropdowns() {
  try {
    const venues = await apiGet('listVenues');
    const evalSelect = document.getElementById('eval-venue');
    evalSelect.innerHTML = '<option value="">Sélectionner une salle...</option>';
    venues.forEach(venue => {
      evalSelect.innerHTML += `<option value="${venue.id}">${venue.nom} (${venue.ville_quartier})</option>`;
    });
  } catch (error) {
    console.error('Erreur chargement venues dropdown:', error);
  }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

function updateAdminMode() {
  state.isAdmin = !!state.adminCode;
  
  if (state.isAdmin) {
    document.body.classList.add('admin-mode');
    document.getElementById('admin-login-form').classList.add('hidden');
    document.getElementById('admin-logged').classList.remove('hidden');
  } else {
    document.body.classList.remove('admin-mode');
    document.getElementById('admin-login-form').classList.remove('hidden');
    document.getElementById('admin-logged').classList.add('hidden');
  }
}

function adminLogin() {
  const code = document.getElementById('admin-code-input').value;
  if (!code) {
    showToast('Veuillez entrer le code admin', 'error');
    return;
  }
  
  state.adminCode = code;
  localStorage.setItem('adminCode', code);
  updateAdminMode();
  closeModal('modal-admin');
  showToast('Mode admin activé', 'success');
}

function adminLogout() {
  state.adminCode = '';
  localStorage.removeItem('adminCode');
  updateAdminMode();
  closeModal('modal-admin');
  showToast('Mode admin désactivé', 'success');
}

// ============================================
// EVENT HANDLERS
// ============================================

// Tab navigation
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    
    if (tab.dataset.tab === 'evaluation') {
      loadVenueDropdowns();
    }
  });
});

// Filters
document.getElementById('search-input').addEventListener('input', debounce(applyFilters, 300));
document.getElementById('filter-statut').addEventListener('change', applyFilters);
document.getElementById('filter-capacite').addEventListener('change', applyFilters);

// Add venue button
document.getElementById('btn-add-venue').addEventListener('click', openAddVenue);

// Admin mode
document.getElementById('btn-admin-mode').addEventListener('click', () => openModal('modal-admin'));
document.getElementById('btn-admin-login').addEventListener('click', adminLogin);
document.getElementById('btn-admin-logout').addEventListener('click', adminLogout);

// Close modals
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', closeAllModals);
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeAllModals();
  });
});

document.getElementById('btn-cancel-venue').addEventListener('click', () => closeModal('modal-venue-form'));
document.getElementById('btn-cancel-delete').addEventListener('click', () => closeModal('modal-confirm-delete'));

// Venue form submit
document.getElementById('venue-form').addEventListener('submit', async e => {
  e.preventDefault();
  
  const id = document.getElementById('venue-id').value;
  const action = id ? 'updateVenue' : 'addVenue';
  
  const data = {
    adminCode: state.adminCode,
    id: id || undefined,
    nom: document.getElementById('venue-nom').value,
    ville_quartier: document.getElementById('venue-ville').value,
    adresse: document.getElementById('venue-adresse').value,
    lien_maps: document.getElementById('venue-maps').value,
    site_web: document.getElementById('venue-site').value,
    contact_nom: document.getElementById('venue-contact-nom').value,
    contact_role: document.getElementById('venue-contact-role').value,
    contact_email: document.getElementById('venue-contact-email').value,
    contact_tel: document.getElementById('venue-contact-tel').value,
    capacite_debout: document.getElementById('venue-capacite-debout').value,
    capacite_assise: document.getElementById('venue-capacite-assise').value,
    type: document.getElementById('venue-type').value,
    concert_vers_club: document.getElementById('venue-concert-club').value,
    statut: document.getElementById('venue-statut').value,
    prix_conditions: document.getElementById('venue-prix').value,
    dates_possibles: document.getElementById('venue-dates').value,
    technique_incluse: document.getElementById('venue-tech').value,
    acces: document.getElementById('venue-acces').value,
    contraintes: document.getElementById('venue-contraintes').value,
    image_url: document.getElementById('venue-image').value,
    created_by: document.getElementById('venue-created-by').value
  };
  
  try {
    await apiPost(action, data);
    showToast(id ? 'Salle modifiée avec succès' : 'Salle ajoutée avec succès');
    closeModal('modal-venue-form');
    loadVenues();
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// Delete confirmation
document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
  if (!state.venueToDelete) return;
  
  try {
    await apiPost('deleteVenue', {
      adminCode: state.adminCode,
      id: state.venueToDelete
    });
    showToast('Salle supprimée');
    closeModal('modal-confirm-delete');
    state.venueToDelete = null;
    loadVenues();
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// Image preview
document.getElementById('venue-image').addEventListener('input', e => {
  const url = e.target.value;
  const preview = document.getElementById('venue-image-preview');
  
  if (url) {
    preview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.style.display='none'">`;
  } else {
    preview.innerHTML = '';
  }
});

// Score sliders
document.querySelectorAll('input[type="range"]').forEach(slider => {
  const displayId = slider.id.replace('eval-score-', 'score-') + '-display';
  const display = document.getElementById(displayId);
  
  if (display) {
    slider.addEventListener('input', () => {
      display.textContent = slider.value;
    });
  }
});

// Evaluation venue change -> load history
document.getElementById('eval-venue').addEventListener('change', async e => {
  const venueId = e.target.value;
  const historyContainer = document.getElementById('evaluation-history');
  
  if (!venueId) {
    historyContainer.innerHTML = '<p class="hint">Sélectionnez une salle pour voir son historique d\'évaluations.</p>';
    return;
  }
  
  try {
    const reviews = await apiGet('listReviews', { venueId });
    if (reviews.length === 0) {
      historyContainer.innerHTML = '<p class="hint">Aucune évaluation pour cette salle.</p>';
    } else {
      historyContainer.innerHTML = reviews.map(r => renderReviewCard(r)).join('');
    }
  } catch (error) {
    historyContainer.innerHTML = '<p class="hint">Erreur de chargement.</p>';
  }
});

// Evaluation form submit
document.getElementById('evaluation-form').addEventListener('submit', async e => {
  e.preventDefault();
  
  const venueId = document.getElementById('eval-venue').value;
  if (!venueId) {
    showToast('Veuillez sélectionner une salle', 'error');
    return;
  }
  
  const btn = document.getElementById('btn-submit-review');
  btn.disabled = true;
  btn.textContent = 'Enregistrement...';
  
  const data = {
    venue_id: venueId,
    visite_par: document.getElementById('eval-visitor').value,
    visit_date: document.getElementById('eval-date').value,
    note_globale: document.getElementById('eval-score-global').value,
    note_technique: document.getElementById('eval-score-technique').value,
    note_accueil: document.getElementById('eval-score-accueil').value,
    note_acces: document.getElementById('eval-score-acces').value,
    note_concert_vers_club: document.getElementById('eval-score-concert-club').value,
    note_prix_valeur: document.getElementById('eval-score-prix').value,
    points_forts: document.getElementById('eval-points-forts').value,
    points_faibles_risques: document.getElementById('eval-points-faibles').value,
    prix_observe: document.getElementById('eval-prix').value,
    disponibilites_observees: document.getElementById('eval-dispo').value,
    contraintes_observees: document.getElementById('eval-contraintes').value,
    prochaine_action: document.getElementById('eval-action').value,
    photos_urls: document.getElementById('eval-photos').value
  };
  
  try {
    await apiPost('addReview', data);
    showToast('Évaluation enregistrée avec succès');
    
    // Reset form but keep venue selected
    const selectedVenue = document.getElementById('eval-venue').value;
    document.getElementById('evaluation-form').reset();
    document.getElementById('eval-venue').value = selectedVenue;
    
    // Reset score displays
    document.querySelectorAll('.score-display').forEach(d => d.textContent = '5');
    
    // Reload reviews
    const reviews = await apiGet('listReviews', { venueId: selectedVenue });
    const historyContainer = document.getElementById('evaluation-history');
    historyContainer.innerHTML = reviews.map(r => renderReviewCard(r)).join('');
    
    // Reload venues to update scores
    loadVenues();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enregistrer l\'évaluation';
  }
});

// Set default date to today
document.getElementById('eval-date').valueAsDate = new Date();

// Keyboard navigation
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeAllModals();
  }
});

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Check API configuration
  if (API_BASE === 'COLLE_ICI_TON_URL_APPS_SCRIPT' || !API_BASE.includes('script.google.com')) {
    document.getElementById('loading-venues').classList.add('hidden');
    document.getElementById('error-venues').classList.remove('hidden');
    document.getElementById('error-venues-message').innerHTML = `
      <strong>Configuration requise !</strong><br>
      Ouvrez <code>app.js</code> et remplacez la variable <code>API_BASE</code> par votre URL Apps Script /exec.
    `;
    return;
  }
  
  // Initialize
  updateAdminMode();
  loadVenues();
});
