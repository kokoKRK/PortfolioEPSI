// Script pour inclure le header et le footer dans toutes les pages

document.addEventListener('DOMContentLoaded', function() {
    // Inclure le header
    const headerElement = document.querySelector('[data-include="header"]');
    if (headerElement) {
        fetch('components/header.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                return response.text();
            })
            .then(data => {
                headerElement.innerHTML = data;
                
                // Appliquer les animations d'entrée uniquement à la première visite
                if (typeof setupEntryAnimations === 'function') {
                    setupEntryAnimations();
                }
                
                // S'assurer que les scripts du header sont correctement initialisés
                if (typeof setupSwitcherNav === 'function') {
                    setupSwitcherNav();
                }
                
                if (typeof setupMobileMenu === 'function') {
                    setupMobileMenu();
                }
                
                // Mettre en évidence le lien actif dans la navigation
                highlightActiveLink();
            })
            .catch(error => console.error('Erreur lors du chargement du header:', error));
    }
    
    // Inclure le footer
    const footerElement = document.querySelector('[data-include="footer"]');
    if (footerElement) {
        fetch('components/footer.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                return response.text();
            })
            .then(data => {
                footerElement.innerHTML = data;
                // Mettre à jour l'année dans le pied de page après le chargement
                updateFooterYear();
            })
            .catch(error => console.error('Erreur lors du chargement du footer:', error));
    }
    
    // Fonction pour mettre à jour l'année dans le pied de page
    function updateFooterYear() {
        const yearElement = document.querySelector('[data-current-year]');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }
});

// Mettre en évidence le lien actif dans la navigation
function highlightActiveLink() {
    // Récupérer le chemin de la page actuelle
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'index.html';
    const pageId = window.location.hash || '#accueil';
    
    // Gestion des liens du menu mobile
    const mobileLinks = document.querySelectorAll('.mobile-menu a');
    
    // Sur la page choix.html, aucun lien ne doit être surligné
    if (currentPage === 'choix.html') {
        mobileLinks.forEach(link => {
            link.classList.remove('active');
        });
        return;
    }
    
    mobileLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        // Vérifier si le lien pointe vers une section de la page actuelle
        if (href.includes('#') && !href.startsWith('http')) {
            const [pageName, sectionId] = href.split('#');
            
            // Lien vers une section de la page actuelle
            if ((pageName === '' || pageName === currentPage) && '#' + sectionId === pageId) {
                link.classList.add('active');
            } 
            // Lien vers une autre page
            else if (pageName && pageName === currentPage) {
                link.classList.add('active');
            }
            else {
                link.classList.remove('active');
            }
        }
        // Lien simple vers une page
        else if (href === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
} 