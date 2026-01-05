/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SUIVI DES LIEUX - Release Party Shorty7G & Friends
 * Frontend JavaScript - VERSION AMÉLIORÉE UI/UX
 * Association 100sations
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ============================================
// CONFIGURATION
// ============================================

// 🚀 API Render (PostgreSQL)
const API_BASE = 'https://one00sations-venue-tracker-api.onrender.com';

// ============================================
// GLOBAL STATE
// ============================================

const state = {
  venues: [],
  currentVenue: null,
  venueToDelete: null,
  adminCode: localStorage.getItem('adminCode') || '',
  isAdmin: false,
  isLoading: false
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Enhanced Toast notifications with icons and animations
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  container.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });
  
  // Auto remove
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Format date with relative time
 */
function formatDate(dateStr, relative = false) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  if (relative) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
  }
  
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
 * Get score color based on value
 */
function getScoreColor(score, max = 10) {
  const percent = (score / max) * 100;
  if (percent >= 80) return 'var(--success)';
  if (percent >= 60) return 'var(--warning)';
  if (percent >= 40) return '#f97316';
  return 'var(--danger)';
}

/**
 * Status labels and colors
 */
const statusConfig = {
  'A_contacter': { label: 'À contacter', color: '#f59e0b', bg: '#fef3c7' },
  'En_discussion': { label: 'En discussion', color: '#3b82f6', bg: '#dbeafe' },
  'Option': { label: 'Option', color: '#6366f1', bg: '#e0e7ff' },
  'Refus': { label: 'Refus', color: '#ef4444', bg: '#fee2e2' },
  'Confirme': { label: 'Confirmé', color: '#10b981', bg: '#d1fae5' }
};

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

/**
 * Animate element entrance
 */
function animateIn(element, delay = 0) {
  element.style.opacity = '0';
  element.style.transform = 'translateY(20px)';
  
  setTimeout(() => {
    element.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
  }, delay);
}

/**
 * Set button loading state
 */
function setButtonLoading(btn, loading, originalText = '') {
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="btn-spinner"></span> Chargement...`;
    btn.disabled = true;
    btn.classList.add('btn-loading');
  } else {
    btn.innerHTML = originalText || btn.dataset.originalText || 'OK';
    btn.disabled = false;
    btn.classList.remove('btn-loading');
  }
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * API GET request
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
    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.error || 'Erreur API');
    }
    return data.data;
  } catch (error) {
    console.error('API GET Error:', error);
    throw error;
  }
}

/**
 * API POST request
 */
async function apiPost(action, body = {}) {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...body })
    });
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.error || 'Erreur API');
    }
    return data.data;
  } catch (error) {
    console.error('API POST Error:', error);
    throw error;
  }
}

// ============================================
// SKELETON LOADERS
// ============================================

function renderSkeletonCards(count = 6) {
  const grid = document.getElementById('venues-grid');
  grid.innerHTML = '';
  
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'venue-card skeleton-card';
    skeleton.innerHTML = `
      <div class="skeleton skeleton-image"></div>
      <div class="venue-card-body">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
      </div>
    `;
    grid.appendChild(skeleton);
  }
}

function renderSkeletonReviews(count = 3) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="review-card skeleton-review">
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
        <div class="skeleton skeleton-text"></div>
      </div>
    `;
  }
  return html;
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

function renderVenueCard(venue, index = 0) {
  const card = document.createElement('div');
  card.className = 'venue-card';
  card.dataset.id = venue.id;
  
  const stats = venue._stats || {};
  const status = statusConfig[venue.statut] || { label: venue.statut, color: '#64748b', bg: '#f1f5f9' };
  
  // Score with color
  const scoreHtml = stats.avg_note_globale 
    ? `<span class="venue-card-score" style="color: ${getScoreColor(stats.avg_note_globale)}">
        <span class="score-star">★</span> ${stats.avg_note_globale.toFixed(1)}
       </span>`
    : '';
  
  // Image or avatar
  const imageHtml = venue.image_url 
    ? `<div class="venue-card-image-wrapper">
        <img src="${venue.image_url}" alt="${venue.nom}" class="venue-card-image" 
             onerror="this.parentElement.innerHTML='<div class=\\'venue-card-avatar\\'>${getInitials(venue.nom)}</div>'">
       </div>`
    : `<div class="venue-card-image-wrapper">
        <div class="venue-card-avatar">${getInitials(venue.nom)}</div>
       </div>`;
  
  card.innerHTML = `
    ${imageHtml}
    <div class="venue-card-body">
      <div class="venue-card-header">
        <h3 class="venue-card-name">${venue.nom}</h3>
        <span class="badge" style="background: ${status.bg}; color: ${status.color}">${status.label}</span>
      </div>
      <p class="venue-card-location">
        <span class="location-icon">📍</span> ${venue.ville_quartier}
      </p>
      <div class="venue-card-meta">
        ${venue.capacite_debout ? `<span class="venue-card-capacity"><span class="capacity-icon">👥</span> ${venue.capacite_debout}</span>` : ''}
        ${scoreHtml}
        ${stats.nb_reviews ? `<span class="venue-card-reviews">${stats.nb_reviews} avis</span>` : '<span class="venue-card-reviews no-reviews">Pas d\'avis</span>'}
      </div>
      ${stats.last_visit_date ? `<p class="venue-card-last-visit">Dernière visite: ${formatDate(stats.last_visit_date, true)}</p>` : ''}
    </div>
    <div class="venue-card-hover-overlay">
      <span>Voir détails →</span>
    </div>
  `;
  
  // Staggered animation
  animateIn(card, index * 50);
  
  card.addEventListener('click', () => openVenueDetail(venue.id));
  
  // Touch feedback
  card.addEventListener('touchstart', () => card.classList.add('touching'), { passive: true });
  card.addEventListener('touchend', () => card.classList.remove('touching'), { passive: true });
  
  return card;
}

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
  
  // Update counter
  const counter = document.getElementById('venues-counter');
  if (counter) {
    counter.textContent = `${venues.length} salle${venues.length > 1 ? 's' : ''}`;
  }
  
  venues.forEach((venue, index) => {
    grid.appendChild(renderVenueCard(venue, index));
  });
}

function renderVenueDetail(venue, reviews = [], stats = {}) {
  const container = document.getElementById('venue-detail-content');
  const status = statusConfig[venue.statut] || { label: venue.statut, color: '#64748b', bg: '#f1f5f9' };
  const avgNotes = stats.avg_notes || {};
  
  // Image or avatar
  const imageHtml = venue.image_url 
    ? `<img src="${venue.image_url}" alt="${venue.nom}" class="venue-detail-image" 
           onerror="this.outerHTML='<div class=\\'venue-detail-avatar\\'>${getInitials(venue.nom)}</div>'">`
    : `<div class="venue-detail-avatar">${getInitials(venue.nom)}</div>`;
  
  // Score badges with colors
  const renderScoreBadge = (value, label) => {
    if (!value) return '';
    return `
      <div class="score-badge">
        <span class="score-badge-value" style="color: ${getScoreColor(value)}">${value.toFixed(1)}</span>
        <span class="score-badge-label">${label}</span>
      </div>
    `;
  };
  
  const scoresHtml = stats.avg_note_globale ? `
    <div class="venue-detail-scores">
      ${renderScoreBadge(stats.avg_note_globale, 'Global')}
      ${renderScoreBadge(avgNotes.note_technique, 'Technique')}
      ${renderScoreBadge(avgNotes.note_accueil, 'Accueil')}
      ${renderScoreBadge(avgNotes.note_acces, 'Accès')}
      ${renderScoreBadge(avgNotes.note_concert_vers_club, 'Concert→Club')}
      ${renderScoreBadge(avgNotes.note_prix_valeur, 'Prix')}
    </div>
  ` : '<p class="hint no-reviews-hint">🎯 Aucune évaluation — soyez le premier !</p>';
  
  // Reviews
  const reviewsHtml = reviews.length > 0 
    ? reviews.map((review, i) => renderReviewCard(review, i)).join('')
    : '<div class="empty-reviews"><span class="empty-icon">📝</span><p>Aucune évaluation pour le moment</p></div>';
  
  // Admin actions
  const adminActionsHtml = state.isAdmin ? `
    <div class="venue-detail-actions">
      <button class="btn btn-primary btn-with-icon" onclick="openEditVenue('${venue.id}')">
        <span class="btn-icon">✏️</span> Modifier
      </button>
      <button class="btn btn-danger btn-with-icon" onclick="openDeleteConfirm('${venue.id}')">
        <span class="btn-icon">🗑️</span> Supprimer
      </button>
    </div>
  ` : '';
  
  // Concert vers club indicator
  const concertClubIcon = venue.concert_vers_club === 'oui' ? '✅' : venue.concert_vers_club === 'non' ? '❌' : '❓';
  
  container.innerHTML = `
    <div class="venue-detail">
      <div class="venue-detail-header">
        ${imageHtml}
        <div class="venue-detail-info">
          <h2>${venue.nom}</h2>
          <p class="venue-detail-location">
            <span class="location-pin">📍</span> ${venue.ville_quartier}
            ${venue.adresse ? `<br><small class="address">${venue.adresse}</small>` : ''}
          </p>
          <div class="venue-detail-badges">
            <span class="badge badge-large" style="background: ${status.bg}; color: ${status.color}">${status.label}</span>
            <span class="badge badge-type">${typeLabels[venue.type] || venue.type}</span>
          </div>
          ${venue.lien_maps ? `<a href="${venue.lien_maps}" target="_blank" class="maps-link">🗺️ Voir sur Google Maps</a>` : ''}
          ${scoresHtml}
        </div>
      </div>
      
      <div class="venue-detail-sections">
        <div class="venue-detail-section">
          <h3><span class="section-icon">ℹ️</span> Informations générales</h3>
          <div class="venue-detail-grid">
            <div class="venue-detail-item">
              <strong>Type</strong>
              <span>${typeLabels[venue.type] || venue.type}</span>
            </div>
            <div class="venue-detail-item">
              <strong>Concert → Club</strong>
              <span>${concertClubIcon} ${venue.concert_vers_club === 'oui' ? 'Oui' : venue.concert_vers_club === 'non' ? 'Non' : 'Incertain'}</span>
            </div>
            <div class="venue-detail-item">
              <strong>Capacité debout</strong>
              <span class="capacity-value">${venue.capacite_debout || '-'}</span>
            </div>
            <div class="venue-detail-item">
              <strong>Capacité assise</strong>
              <span>${venue.capacite_assise || '-'}</span>
            </div>
            ${venue.site_web ? `<div class="venue-detail-item full-width"><strong>Site web</strong><a href="${venue.site_web}" target="_blank" class="external-link">${venue.site_web} ↗</a></div>` : ''}
          </div>
        </div>
        
        ${(venue.contact_nom || venue.contact_email || venue.contact_tel) ? `
          <div class="venue-detail-section">
            <h3><span class="section-icon">👤</span> Contact</h3>
            <div class="venue-detail-grid">
              ${venue.contact_nom ? `<div class="venue-detail-item"><strong>Nom</strong><span>${venue.contact_nom}${venue.contact_role ? ` <small>(${venue.contact_role})</small>` : ''}</span></div>` : ''}
              ${venue.contact_email ? `<div class="venue-detail-item"><strong>Email</strong><a href="mailto:${venue.contact_email}" class="contact-link">📧 ${venue.contact_email}</a></div>` : ''}
              ${venue.contact_tel ? `<div class="venue-detail-item"><strong>Téléphone</strong><a href="tel:${venue.contact_tel}" class="contact-link">📞 ${venue.contact_tel}</a></div>` : ''}
            </div>
          </div>
        ` : ''}
        
        ${(venue.prix_conditions || venue.dates_possibles || venue.technique_incluse || venue.acces || venue.contraintes) ? `
          <div class="venue-detail-section">
            <h3><span class="section-icon">📋</span> Détails pratiques</h3>
            <div class="venue-detail-list">
              ${venue.prix_conditions ? `<div class="detail-item"><span class="detail-icon">💰</span><div><strong>Prix / Conditions</strong><p>${venue.prix_conditions}</p></div></div>` : ''}
              ${venue.dates_possibles ? `<div class="detail-item"><span class="detail-icon">📅</span><div><strong>Dates possibles</strong><p>${venue.dates_possibles}</p></div></div>` : ''}
              ${venue.technique_incluse ? `<div class="detail-item"><span class="detail-icon">🎛️</span><div><strong>Technique incluse</strong><p>${venue.technique_incluse}</p></div></div>` : ''}
              ${venue.acces ? `<div class="detail-item"><span class="detail-icon">🚗</span><div><strong>Accès</strong><p>${venue.acces}</p></div></div>` : ''}
              ${venue.contraintes ? `<div class="detail-item"><span class="detail-icon">⚠️</span><div><strong>Contraintes</strong><p>${venue.contraintes}</p></div></div>` : ''}
            </div>
          </div>
        ` : ''}
        
        <div class="venue-detail-section reviews-section">
          <h3>
            <span class="section-icon">📝</span> Évaluations 
            <span class="reviews-count">${reviews.length}</span>
          </h3>
          <div class="reviews-list">
            ${reviewsHtml}
          </div>
        </div>
      </div>
      
      ${adminActionsHtml}
    </div>
  `;
  
  // Animate sections
  container.querySelectorAll('.venue-detail-section').forEach((section, i) => {
    animateIn(section, i * 100);
  });
}

function renderReviewCard(review, index = 0) {
  const photos = review.photos_urls 
    ? review.photos_urls.split(',').map(u => u.trim()).filter(u => u)
    : [];
  
  const photosHtml = photos.length > 0 
    ? `<div class="review-photos">${photos.map(p => `<img src="${p}" alt="Photo" onclick="openImageModal('${p}')" onerror="this.style.display='none'">`).join('')}</div>`
    : '';
  
  const scoreColor = getScoreColor(review.note_globale);
  
  return `
    <div class="review-card" style="animation-delay: ${index * 50}ms">
      <div class="review-header">
        <div class="review-author-info">
          <div class="review-avatar">${getInitials(review.visite_par)}</div>
          <div>
            <span class="review-author">${review.visite_par}</span>
            <span class="review-date">${formatDate(review.visit_date)}</span>
          </div>
        </div>
        <div class="review-score-big" style="background: ${scoreColor}20; color: ${scoreColor}">
          ${review.note_globale}<span class="score-max">/10</span>
        </div>
      </div>
      
      <div class="review-scores">
        ${review.note_technique ? `<span class="review-score-mini"><span class="mini-label">Tech</span> ${review.note_technique}</span>` : ''}
        ${review.note_accueil ? `<span class="review-score-mini"><span class="mini-label">Accueil</span> ${review.note_accueil}</span>` : ''}
        ${review.note_acces ? `<span class="review-score-mini"><span class="mini-label">Accès</span> ${review.note_acces}</span>` : ''}
        ${review.note_concert_vers_club ? `<span class="review-score-mini"><span class="mini-label">Concert→Club</span> ${review.note_concert_vers_club}</span>` : ''}
        ${review.note_prix_valeur ? `<span class="review-score-mini"><span class="mini-label">Prix</span> ${review.note_prix_valeur}</span>` : ''}
      </div>
      
      <div class="review-content">
        ${review.points_forts ? `<div class="review-item positive"><span class="review-item-icon">✅</span><div><strong>Points forts</strong><p>${review.points_forts}</p></div></div>` : ''}
        ${review.points_faibles_risques ? `<div class="review-item negative"><span class="review-item-icon">⚠️</span><div><strong>Points faibles</strong><p>${review.points_faibles_risques}</p></div></div>` : ''}
        ${review.prix_observe ? `<div class="review-item"><span class="review-item-icon">💰</span><div><strong>Prix observé</strong><p>${review.prix_observe}</p></div></div>` : ''}
        ${review.disponibilites_observees ? `<div class="review-item"><span class="review-item-icon">📅</span><div><strong>Disponibilités</strong><p>${review.disponibilites_observees}</p></div></div>` : ''}
        ${review.contraintes_observees ? `<div class="review-item"><span class="review-item-icon">🚧</span><div><strong>Contraintes</strong><p>${review.contraintes_observees}</p></div></div>` : ''}
        ${review.prochaine_action ? `<div class="review-item action"><span class="review-item-icon">➡️</span><div><strong>Prochaine action</strong><p>${review.prochaine_action}</p></div></div>` : ''}
      </div>
      
      ${photosHtml}
    </div>
  `;
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Focus trap
  const focusable = modal.querySelectorAll('button, input, select, textarea');
  if (focusable.length) focusable[0].focus();
  
  // Animate content
  const content = modal.querySelector('.modal-content');
  if (content) {
    content.style.transform = 'scale(0.9) translateY(20px)';
    content.style.opacity = '0';
    requestAnimationFrame(() => {
      content.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      content.style.transform = 'scale(1) translateY(0)';
      content.style.opacity = '1';
    });
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  const content = modal.querySelector('.modal-content');
  
  if (content) {
    content.style.transform = 'scale(0.9) translateY(20px)';
    content.style.opacity = '0';
  }
  
  setTimeout(() => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }, 200);
}

function closeAllModals() {
  document.querySelectorAll('.modal.active').forEach(modal => {
    closeModal(modal.id);
  });
}

async function openVenueDetail(id) {
  openModal('modal-venue-detail');
  
  // Show loading state
  const container = document.getElementById('venue-detail-content');
  container.innerHTML = `
    <div class="modal-loading">
      <div class="spinner-large"></div>
      <p>Chargement des détails...</p>
    </div>
  `;
  
  try {
    const result = await apiGet('getVenue', { id });
    state.currentVenue = result.venue;
    renderVenueDetail(result.venue, result.reviews, result.stats);
  } catch (error) {
    container.innerHTML = `
      <div class="modal-error">
        <span class="error-icon">❌</span>
        <p>${error.message}</p>
        <button class="btn btn-primary" onclick="openVenueDetail('${id}')">Réessayer</button>
      </div>
    `;
    showToast(error.message, 'error');
  }
}

function openAddVenue() {
  document.getElementById('venue-form-title').textContent = '➕ Ajouter une salle';
  document.getElementById('venue-form').reset();
  document.getElementById('venue-id').value = '';
  document.getElementById('venue-image-preview').innerHTML = '';
  openModal('modal-venue-form');
}

async function openEditVenue(id) {
  closeModal('modal-venue-detail');
  openModal('modal-venue-form');
  
  document.getElementById('venue-form-title').textContent = '✏️ Modifier la salle';
  
  try {
    const result = await apiGet('getVenue', { id });
    const venue = result.venue;
    
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
    
    updateImagePreview(venue.image_url);
  } catch (error) {
    showToast(error.message, 'error');
    closeModal('modal-venue-form');
  }
}

function openDeleteConfirm(id) {
  state.venueToDelete = id;
  closeModal('modal-venue-detail');
  openModal('modal-confirm-delete');
}

function openImageModal(url) {
  const modal = document.createElement('div');
  modal.className = 'image-lightbox';
  modal.innerHTML = `
    <div class="lightbox-content">
      <img src="${url}" alt="Photo">
      <button class="lightbox-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.remove();
  });
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('active'));
}

// ============================================
// DATA LOADING
// ============================================

async function loadVenues() {
  const loading = document.getElementById('loading-venues');
  const error = document.getElementById('error-venues');
  const grid = document.getElementById('venues-grid');
  const empty = document.getElementById('empty-venues');
  
  error.classList.add('hidden');
  empty.classList.add('hidden');
  
  // Show skeleton loaders
  renderSkeletonCards(6);
  loading.classList.add('hidden');
  
  try {
    const venues = await apiGet('listVenues');
    state.venues = venues;
    applyFilters();
  } catch (err) {
    console.error('Erreur chargement venues:', err);
    grid.innerHTML = '';
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
      (v.ville_quartier && v.ville_quartier.toLowerCase().includes(search))
    );
  }
  
  if (statut) {
    filtered = filtered.filter(v => v.statut === statut);
  }
  
  if (capacite) {
    filtered = filtered.filter(v => v.capacite_debout >= capacite);
  }
  
  renderVenuesGrid(filtered);
  
  // Update search feedback
  const searchFeedback = document.getElementById('search-feedback');
  if (searchFeedback) {
    if (search || statut || capacite) {
      searchFeedback.textContent = `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`;
      searchFeedback.classList.remove('hidden');
    } else {
      searchFeedback.classList.add('hidden');
    }
  }
}

async function loadVenueDropdowns() {
  const evalSelect = document.getElementById('eval-venue');
  evalSelect.innerHTML = '<option value="">Chargement...</option>';
  evalSelect.disabled = true;
  
  try {
    const venues = await apiGet('listVenues');
    evalSelect.innerHTML = '<option value="">Sélectionner une salle...</option>';
    venues.forEach(venue => {
      const stats = venue._stats || {};
      const reviewInfo = stats.nb_reviews ? ` (${stats.nb_reviews} avis)` : ' (Pas d\'avis)';
      evalSelect.innerHTML += `<option value="${venue.id}">${venue.nom} — ${venue.ville_quartier}${reviewInfo}</option>`;
    });
    evalSelect.disabled = false;
  } catch (error) {
    evalSelect.innerHTML = '<option value="">Erreur de chargement</option>';
    console.error('Erreur chargement venues dropdown:', error);
  }
}

// ============================================
// FORM HELPERS
// ============================================

function updateImagePreview(url) {
  const preview = document.getElementById('venue-image-preview');
  if (url) {
    preview.innerHTML = `
      <div class="preview-image-wrapper">
        <img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<div class=\\'preview-error\\'>Image non disponible</div>'">
        <button type="button" class="preview-remove" onclick="clearImagePreview()">×</button>
      </div>
    `;
  } else {
    preview.innerHTML = '';
  }
}

function clearImagePreview() {
  document.getElementById('venue-image').value = '';
  document.getElementById('venue-image-preview').innerHTML = '';
}

function updateScoreDisplay(sliderId, displayId) {
  const slider = document.getElementById(sliderId);
  const display = document.getElementById(displayId);
  if (slider && display) {
    const value = parseInt(slider.value);
    display.textContent = value;
    display.style.color = getScoreColor(value);
    
    // Update slider track color
    const percent = ((value - 1) / 9) * 100;
    slider.style.background = `linear-gradient(to right, ${getScoreColor(value)} 0%, ${getScoreColor(value)} ${percent}%, var(--border) ${percent}%, var(--border) 100%)`;
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
    const input = document.getElementById('admin-code-input');
    input.classList.add('input-error');
    setTimeout(() => input.classList.remove('input-error'), 500);
    return;
  }
  
  state.adminCode = code;
  localStorage.setItem('adminCode', code);
  updateAdminMode();
  closeModal('modal-admin');
  showToast('🔓 Mode admin activé', 'success');
}

function adminLogout() {
  state.adminCode = '';
  localStorage.removeItem('adminCode');
  updateAdminMode();
  closeModal('modal-admin');
  showToast('🔒 Mode admin désactivé', 'info');
}

// ============================================
// EVENT HANDLERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize
  updateAdminMode();
  loadVenues();
  
  // Set default date
  const dateInput = document.getElementById('eval-date');
  if (dateInput) {
    dateInput.valueAsDate = new Date();
  }
  
  // Initialize score sliders
  initializeScoreSliders();
});

// Tab navigation with smooth transition
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    // Add ripple effect
    const ripple = document.createElement('span');
    ripple.className = 'tab-ripple';
    tab.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
    
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => {
      c.classList.remove('active');
      c.style.opacity = '0';
    });
    
    tab.classList.add('active');
    const content = document.getElementById(`tab-${tab.dataset.tab}`);
    content.classList.add('active');
    requestAnimationFrame(() => {
      content.style.transition = 'opacity 0.3s ease';
      content.style.opacity = '1';
    });
    
    if (tab.dataset.tab === 'evaluation') {
      loadVenueDropdowns();
    }
  });
});

// Filters with visual feedback
document.getElementById('search-input').addEventListener('input', debounce((e) => {
  const wrapper = e.target.closest('.search-box');
  wrapper.classList.add('searching');
  setTimeout(() => wrapper.classList.remove('searching'), 300);
  applyFilters();
}, 300));

document.getElementById('search-input').addEventListener('focus', function() {
  this.closest('.search-box').classList.add('focused');
});

document.getElementById('search-input').addEventListener('blur', function() {
  this.closest('.search-box').classList.remove('focused');
});

document.getElementById('filter-statut').addEventListener('change', applyFilters);
document.getElementById('filter-capacite').addEventListener('change', applyFilters);

// Add venue button
document.getElementById('btn-add-venue').addEventListener('click', openAddVenue);

// Admin mode
document.getElementById('btn-admin-mode').addEventListener('click', () => openModal('modal-admin'));
document.getElementById('btn-admin-login').addEventListener('click', adminLogin);
document.getElementById('btn-admin-logout').addEventListener('click', adminLogout);

// Enter key for admin login
document.getElementById('admin-code-input').addEventListener('keypress', e => {
  if (e.key === 'Enter') adminLogin();
});

// Close modals
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', function() {
    const modal = this.closest('.modal');
    closeModal(modal.id);
  });
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal(modal.id);
  });
});

document.getElementById('btn-cancel-venue').addEventListener('click', () => closeModal('modal-venue-form'));
document.getElementById('btn-cancel-delete').addEventListener('click', () => closeModal('modal-confirm-delete'));

// Venue form submit
document.getElementById('venue-form').addEventListener('submit', async e => {
  e.preventDefault();
  
  const id = document.getElementById('venue-id').value;
  const action = id ? 'updateVenue' : 'addVenue';
  const btn = e.target.querySelector('button[type="submit"]');
  
  setButtonLoading(btn, true);
  
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
    showToast(id ? '✅ Salle modifiée avec succès' : '✅ Salle ajoutée avec succès', 'success');
    closeModal('modal-venue-form');
    loadVenues();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    setButtonLoading(btn, false, id ? 'Enregistrer' : 'Ajouter');
  }
});

// Delete confirmation
document.getElementById('btn-confirm-delete').addEventListener('click', async function() {
  if (!state.venueToDelete) return;
  
  setButtonLoading(this, true);
  
  try {
    await apiPost('deleteVenue', {
      adminCode: state.adminCode,
      id: state.venueToDelete
    });
    showToast('🗑️ Salle supprimée', 'success');
    closeModal('modal-confirm-delete');
    state.venueToDelete = null;
    loadVenues();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    setButtonLoading(this, false, 'Supprimer');
  }
});

// Image preview
document.getElementById('venue-image').addEventListener('input', e => {
  updateImagePreview(e.target.value);
});

// Initialize score sliders
function initializeScoreSliders() {
  const sliders = [
    { slider: 'eval-score-global', display: 'score-global-display' },
    { slider: 'eval-score-technique', display: 'score-technique-display' },
    { slider: 'eval-score-accueil', display: 'score-accueil-display' },
    { slider: 'eval-score-acces', display: 'score-acces-display' },
    { slider: 'eval-score-concert-club', display: 'score-concert-club-display' },
    { slider: 'eval-score-prix', display: 'score-prix-display' }
  ];
  
  sliders.forEach(({ slider, display }) => {
    const sliderEl = document.getElementById(slider);
    if (sliderEl) {
      // Initial update
      updateScoreDisplay(slider, display);
      
      // On input
      sliderEl.addEventListener('input', () => {
        updateScoreDisplay(slider, display);
      });
    }
  });
}

// Evaluation venue change -> load history with animation
document.getElementById('eval-venue').addEventListener('change', async e => {
  const venueId = e.target.value;
  const historyContainer = document.getElementById('evaluation-history');
  
  if (!venueId) {
    historyContainer.innerHTML = '<div class="empty-history"><span class="empty-icon">📋</span><p>Sélectionnez une salle pour voir son historique</p></div>';
    return;
  }
  
  historyContainer.innerHTML = renderSkeletonReviews(3);
  
  try {
    const reviews = await apiGet('listReviews', { venueId });
    if (reviews.length === 0) {
      historyContainer.innerHTML = '<div class="empty-history"><span class="empty-icon">📝</span><p>Aucune évaluation pour cette salle</p><small>Soyez le premier à évaluer !</small></div>';
    } else {
      historyContainer.innerHTML = reviews.map((r, i) => renderReviewCard(r, i)).join('');
    }
  } catch (error) {
    historyContainer.innerHTML = `<div class="error-history"><span class="error-icon">❌</span><p>Erreur de chargement</p></div>`;
  }
});

// Evaluation form submit with animation
document.getElementById('evaluation-form').addEventListener('submit', async e => {
  e.preventDefault();
  
  const venueId = document.getElementById('eval-venue').value;
  if (!venueId) {
    showToast('Veuillez sélectionner une salle', 'warning');
    document.getElementById('eval-venue').focus();
    return;
  }
  
  const visitorName = document.getElementById('eval-visitor').value.trim();
  if (!visitorName) {
    showToast('Veuillez entrer votre nom', 'warning');
    document.getElementById('eval-visitor').focus();
    return;
  }
  
  const btn = document.getElementById('btn-submit-review');
  setButtonLoading(btn, true);
  
  const data = {
    venue_id: venueId,
    visite_par: visitorName,
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
    showToast('✅ Évaluation enregistrée avec succès !', 'success');
    
    // Reset form with animation
    const form = document.getElementById('evaluation-form');
    form.classList.add('form-success');
    
    setTimeout(() => {
      const selectedVenue = document.getElementById('eval-venue').value;
      form.reset();
      document.getElementById('eval-venue').value = selectedVenue;
      document.getElementById('eval-date').valueAsDate = new Date();
      form.classList.remove('form-success');
      
      // Reset score displays
      initializeScoreSliders();
    }, 500);
    
    // Reload reviews with animation
    const reviews = await apiGet('listReviews', { venueId });
    const historyContainer = document.getElementById('evaluation-history');
    historyContainer.innerHTML = reviews.map((r, i) => renderReviewCard(r, i)).join('');
    
    // Scroll to new review
    historyContainer.scrollTop = 0;
    
    // Reload venues to update scores
    loadVenues();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    setButtonLoading(btn, false, 'Enregistrer l\'évaluation');
  }
});

// Keyboard navigation
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeAllModals();
  }
});

// Clear filters button
document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-statut').value = '';
  document.getElementById('filter-capacite').value = '';
  applyFilters();
  showToast('Filtres réinitialisés', 'info');
});
