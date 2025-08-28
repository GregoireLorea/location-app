/**
 * Fonctions d'authentification communes pour l'application Location Manager
 */

// Fonction de déconnexion globale
async function logout() {
  if (confirm('Êtes-vous sûr de vouloir vous déconnecter ? ')) {
    try {
      const response = await fetch('/auth/logout', { method: 'POST' });
      if (response.ok) {
        window.location.href = '/login.html';
      }
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      // Rediriger quand même en cas d'erreur
      window.location.href = '/login.html';
    }
  }
}

// Vérifier le statut d'authentification
async function checkAuthStatus() {
  try {
    const response = await fetch('/auth/status');
    const result = await response.json();
    
    if (!result.authenticated) {
      window.location.href = '/login.html';
      return false;
    }
    
    return result.user;
  } catch (error) {
    console.error('Erreur vérification authentification:', error);
    window.location.href = '/login.html';
    return false;
  }
}

// Intercepter les erreurs 401 pour rediriger vers login
function setupAuthInterceptor() {
  const originalFetch = window.fetch;
  
  window.fetch = function(...args) {
    return originalFetch.apply(this, args)
      .then(response => {
        if (response.status === 401) {
          window.location.href = '/login.html';
        }
        return response;
      })
      .catch(error => {
        console.error('Erreur réseau:', error);
        throw error;
      });
  };
}

// Initialiser l'intercepteur au chargement
document.addEventListener('DOMContentLoaded', function() {
  setupAuthInterceptor();
});
