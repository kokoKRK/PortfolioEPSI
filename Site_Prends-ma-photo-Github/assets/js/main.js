// Initialisation des styles du menu
const initMenuStyles = () => {
    const navMenu = document.querySelector('.mobile-menu');
    if (navMenu) {
        // Vérifier si on est sur mobile
        const isMobile = window.matchMedia('(max-width: 768px)').matches;

        if (isMobile) {
            // Appliquer les styles initiaux uniquement sur mobile
            Object.assign(navMenu.style, {
                display: 'none',
                transform: 'scaleY(0)',
                opacity: '0',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            });

            // Préparer les styles des liens
            const links = navMenu.querySelectorAll('li');
            links.forEach(link => {
                Object.assign(link.style, {
                    opacity: '0',
                    transform: 'translateX(10px)',
                    transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                });
            });
        }
    }
};

// Fonction utilitaire de throttle pour limiter la fréquence d'exécution de fonctions
const throttle = (callback, delay = 100) => {
    let isWaiting = false;
    let lastArgs = null;
    
    // Fonction interne pour exécuter après le délai
    const timeoutFunc = () => {
        if (lastArgs) {
            callback(...lastArgs);
            lastArgs = null;
            setTimeout(timeoutFunc, delay);
        } else {
            isWaiting = false;
        }
    };
    
    // Fonction wrapper retournée
    return (...args) => {
        if (isWaiting) {
            lastArgs = args;
            return;
        }
        
        callback(...args);
        isWaiting = true;
        setTimeout(timeoutFunc, delay);
    };
};

// Gestion des animations d'entrée uniquement à la première visite
const setupEntryAnimations = () => {
    // Vérifier si c'est la première visite de la session
    const isFirstVisit = !sessionStorage.getItem('hasVisitedBefore');
    const header = document.querySelector('header');
    
    if (isFirstVisit) {
        // Pour la première visite, ajouter une classe d'animation au header
        if (header) {
            header.classList.add('animate-entry');
        }
        // Marquer que l'utilisateur a visité le site
        sessionStorage.setItem('hasVisitedBefore', 'true');
    } else {
        // Si ce n'est pas la première visite, supprimer les classes d'animation du header
        const animatedElements = document.querySelectorAll('header .animate');
        if (animatedElements.length > 0) {
            animatedElements.forEach(el => {
                el.classList.remove('animate', 'fade-in-down', 'fade-in', 'fade-in-right');
                // Supprimer toutes les classes de délai
                for (let i = 0; i <= 5; i++) {
                    el.classList.remove(`delay-${i}`);
                }
            });
        }
        
        // S'assurer que le header n'a pas la classe d'animation
        if (header) {
            header.classList.remove('animate-entry');
        }
    }
    
    // Indiquer que la fonction a été exécutée
    console.log("Animation du header: " + (isFirstVisit ? "activée (première visite)" : "désactivée (visite répétée)"));
};

// Réinitialiser les animations (fonction utile pour les tests)
const resetEntryAnimations = () => {
    sessionStorage.removeItem('hasVisitedBefore');
    console.log("Animations réinitialisées. La prochaine visite sera considérée comme une première visite.");
};

// Animation des sections au scroll - optimisée
const setupScrollAnimations = () => {
    const sections = document.querySelectorAll('.concept, .our-booths, .carousel-section, .cta-section');
    
    // Ne pas initialiser si aucune section n'existe
    if (!sections.length) return;
    
    // Vérifier si IntersectionObserver est supporté
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Ajouter la classe avec un délai pour améliorer la fluidité de l'animation
                    requestAnimationFrame(() => {
                        entry.target.classList.add('visible');
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -100px 0px'
        });
        
        sections.forEach(section => {
            observer.observe(section);
        });
    } else {
        // Fallback pour les navigateurs qui ne supportent pas IntersectionObserver
        sections.forEach(section => {
            section.classList.add('visible');
        });
    }
};

// Gestion du préchargeur - optimisée
const setupPageLoader = () => {
    const loader = document.querySelector('.page-loader');
    if (!loader) return;
    
    // Préchargement des images importantes
    const preloadImages = () => {
        // Liste des images prioritaires à précharger
        const criticalImages = [
            'assets/img/logo.png',
            'assets/img/front_page.jpg',
            'assets/img/borne1.png',
            'assets/img/borne2.png'
        ];
        
        let loadedCount = 0;
        const totalImages = criticalImages.length;
        
        // Fonction pour cacher le loader
        const hideLoader = () => {
            loader.classList.add('loaded');
            // Cache réellement le loader après la fin de la transition
            loader.addEventListener('transitionend', () => {
                loader.style.display = 'none';
            }, { once: true });
        };
        
        // Timer de sécurité - mais plus long pour permettre le chargement des images
        const safetyTimer = setTimeout(hideLoader, 2500);
        
        criticalImages.forEach(src => {
            const img = new Image();
            img.onload = img.onerror = () => {
                loadedCount++;
                if (loadedCount >= totalImages) {
                    clearTimeout(safetyTimer);
                    hideLoader();
                }
            };
            img.src = src;
        });
    };
    
    // Lancer le préchargement dès que possible
    if (document.readyState === 'complete') {
        preloadImages();
    } else {
        window.addEventListener('load', preloadImages);
    }
};

// Gestion du menu mobile
const setupMobileMenu = () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.mobile-menu');

    if (!menuToggle || !navMenu) return;

    // Vérifier si on est sur mobile
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    if (isMobile) {
        menuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            const links = navMenu.querySelectorAll('li');

            if (navMenu.classList.contains('active')) {
                // Animation de fermeture
                navMenu.style.transform = 'scaleY(0)';
                navMenu.style.opacity = '0';
                
                links.forEach(link => {
                    link.style.opacity = '0';
                    link.style.transform = 'translateX(10px)';
                });

                setTimeout(() => {
                    navMenu.classList.remove('active');
                    navMenu.style.display = 'none';
                }, 300);
            } else {
                // Animation d'ouverture
                navMenu.style.display = 'flex';
                navMenu.classList.add('active');

                // Forcer un reflow pour s'assurer que les styles sont appliqués
                navMenu.offsetHeight;

                requestAnimationFrame(() => {
                    navMenu.style.transform = 'scaleY(1)';
                    navMenu.style.opacity = '1';

                    // Animer les liens progressivement
                    links.forEach((link, index) => {
                        setTimeout(() => {
                            link.style.opacity = '1';
                            link.style.transform = 'translateX(0)';
                        }, 100 + (index * 50));
                    });
                });
            }
        });

        // Fermer le menu quand on clique en dehors
        document.addEventListener('click', function(event) {
            if (!menuToggle.contains(event.target) && !navMenu.contains(event.target)) {
                menuToggle.classList.remove('active');
                const links = navMenu.querySelectorAll('li');

                navMenu.style.transform = 'scaleY(0)';
                navMenu.style.opacity = '0';
                
                links.forEach(link => {
                    link.style.opacity = '0';
                    link.style.transform = 'translateX(10px)';
                });

                setTimeout(() => {
                    navMenu.classList.remove('active');
                    navMenu.style.display = 'none';
                }, 300);
            }
        });
    }
};

// Configuration de la navbar de style Vercel
const setupSwitcherNav = () => {
    const switcher = document.querySelector('.switcher');
    const switcherBtns = document.querySelectorAll('.switcher-btn');
    
    if (!switcher || !switcherBtns.length) return;
    
    // Initialisation du sélecteur actif
    const calcSwitcher = (activeBtn, targetBtn) => {
        const glow = document.querySelector('.switcher-glow');
        const curr = document.querySelector('.switcher-curr');
        
        if (!glow || !curr) return;
        
        const currLeft = targetBtn.offsetLeft;
        const width = targetBtn.offsetWidth;
        const middle = Math.round(width / 2);
        
        curr.style.width = `${width}px`;
        curr.style.left = `${currLeft}px`;
        glow.style.left = `${currLeft + middle - 19.75}px`;
        
        // Gérer la classe active
        if (activeBtn) {
            activeBtn.classList.remove('btn-active');
        }
        targetBtn.classList.add('btn-active');
    };
    
    // Initialiser le premier bouton comme actif
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const activeSection = window.location.hash.replace('#', '') || 'accueil';
    
    // Ne pas activer de bouton par défaut sur la page choix.html
    if (currentPage === 'choix.html') {
        // Masquer l'indicateur actif
        const curr = document.querySelector('.switcher-curr');
        const glow = document.querySelector('.switcher-glow');
        if (curr) curr.style.opacity = '0';
        if (glow) glow.style.opacity = '0';
        
        // Retirer la classe active de tous les boutons
        switcherBtns.forEach(btn => {
            btn.classList.remove('btn-active');
        });
    } else {
        // Trouver le bouton à activer par défaut
        let defaultActiveBtn = switcherBtns[0]; // Accueil par défaut
        
        switcherBtns.forEach(btn => {
            // Activer le bouton correspondant à la page active
            if (btn.hasAttribute('data-devis') && currentPage === 'devis.html') {
                defaultActiveBtn = btn;
            } else if (btn.hasAttribute('data-contact') && currentPage === 'contact.html') {
                defaultActiveBtn = btn;
            } else if (currentPage === 'index.html' && btn.getAttribute('data-scroll-to') === activeSection) {
                defaultActiveBtn = btn;
            }
        });
        
        calcSwitcher(null, defaultActiveBtn);
    }
    
    // Gérer les clics sur les boutons
    switcherBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Si on est sur choix.html, ne pas mettre en surbrillance mais rediriger
            if (currentPage === 'choix.html') {
                // Redirection selon le bouton cliqué
                if (this.hasAttribute('data-devis')) {
                    window.location.href = 'devis.html';
                    return;
                }
                if (this.hasAttribute('data-contact')) {
                    window.location.href = 'contact.html';
                    return;
                }
                
                const targetId = this.getAttribute('data-scroll-to');
                if (targetId) {
                    window.location.href = `index.html#${targetId}`;
                }
                return;
            }
            
            const activeBtn = document.querySelector('.switcher-btn.btn-active');
            if (activeBtn === this) return;
            
            // Gérer les liens spéciaux (devis et contact)
            if (this.hasAttribute('data-devis')) {
                window.location.href = 'devis.html';
                return;
            }
            if (this.hasAttribute('data-contact')) {
                window.location.href = 'contact.html';
                return;
            }
            
            calcSwitcher(activeBtn, this);
            
            // Faire défiler vers la section si on est sur index.html
            // Sinon rediriger vers index.html avec le bon hash
            const targetId = this.getAttribute('data-scroll-to');
            if (targetId) {
                if (currentPage === 'index.html') {
                    const targetSection = document.getElementById(targetId);
                    if (targetSection) {
                        // Utiliser l'attribut data-offset s'il existe, sinon utiliser la valeur par défaut
                        const offset = parseInt(this.getAttribute('data-offset')) || 90;
                        window.scrollTo({
                            top: targetSection.offsetTop - offset,
                            behavior: 'smooth'
                        });
                    }
                } else {
                    window.location.href = `index.html#${targetId}`;
                }
            }
        });
    });
    
    // Optimisation de la gestion du défilement
    const setupOptimizedScrollHandling = () => {
    if (currentPage === 'index.html') {
            // Utiliser un événement throttle pour optimiser la performance
            window.addEventListener('scroll', throttle(function() {
            // Ignorer sur mobile
            if (window.matchMedia('(max-width: 768px)').matches) return;
            
            const scrollPosition = window.scrollY + 100;
            const sections = [
                document.getElementById('accueil'),
                document.getElementById('concept'),
                document.getElementById('nos-bornes')
                ].filter(section => section !== null); // Filtre les sections qui n'existent pas
                
                // Ne rien faire s'il n'y a pas de sections
                if (!sections.length) return;
            
            let activeSection = null;
            
            // Trouver la section active
            for (let i = sections.length - 1; i >= 0; i--) {
                    if (scrollPosition >= sections[i].offsetTop) {
                        activeSection = sections[i].id;
                    break;
                }
            }
            
            if (activeSection) {
                const activeBtn = document.querySelector('.switcher-btn.btn-active');
                const targetBtn = document.querySelector(`.switcher-btn[data-scroll-to="${activeSection}"]`);
                
                if (targetBtn && activeBtn !== targetBtn) {
                    calcSwitcher(activeBtn, targetBtn);
                }
            }
            }, 100), { passive: true });
    }
    };
};

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    // Note: setupEntryAnimations est maintenant appelé depuis include.js 
    // après le chargement du header
    
    // Initialiser l'animation de chargement immédiatement
    setupPageLoader();
    
    // Utiliser requestIdleCallback ou un fallback pour les tâches non critiques
    const runDeferredTasks = () => {
        // Premier lot de tâches (prioritaires)
    initMenuStyles();
    setupMobileMenu();
    setupSwitcherNav();
    
        // Utiliser setTimeout pour donner au navigateur le temps de respirer
        setTimeout(() => {
            // Deuxième lot de tâches (moins prioritaires)
            setupCarousel();
            setupScrollAnimations();
            setupOptimizedScrollHandling();
            
            // Initialisation des cartes (si existantes) - différé au maximum
            setTimeout(() => {
    const cardElements = $$('.wrap--1');
                if (cardElements && cardElements.length) {
        cardElements.forEach(element => {
            new parallaxTiltEffect({
                element: element,
                tiltEffect: 'reverse'
            });
        });
                }
            }, 500);
        }, 100);
    };
    
    // Utiliser requestIdleCallback si disponible, sinon utiliser setTimeout
    if ('requestIdleCallback' in window) {
        requestIdleCallback(runDeferredTasks);
    } else {
        setTimeout(runDeferredTasks, 1);
    }
});

// Gestion du carrousel
const setupCarousel = () => {
    console.log("Initialisation du carrousel...");
    const track = document.querySelector('.carousel-track');
    if (!track) {
        console.error("Élément carousel-track non trouvé");
        return;
    }

    const slides = Array.from(track.querySelectorAll('.carousel-slide'));
    if (slides.length === 0) {
        console.error("Aucun slide trouvé dans le carrousel");
        return;
    }
    
    console.log(`Nombre de slides trouvés : ${slides.length}`);

    const prevButton = document.querySelector('.prev-button');
    const nextButton = document.querySelector('.next-button');

    // Configuration initiale
    let currentIndex = 0;
    let isEnlarged = false;
    let autoScrollInterval = null;
    let autoScrollTimeout = null;
    const AUTO_SCROLL_DELAY = 5000;
    const AUTO_SCROLL_PAUSE = 10000; // Pause de 10s après interaction

    // Fonction pour mettre à jour la position des slides
    const updateCarousel = () => {
        console.log(`Mise à jour du carrousel - Index actuel : ${currentIndex}`);
        
        // Reset classes et styles
        slides.forEach((slide, i) => {
            slide.classList.remove('active', 'prev', 'next', 'prevPrev', 'nextNext', 'enlarged');
            slide.style.opacity = ''; // Réinitialiser l'opacité
            slide.style.zIndex = ''; // Réinitialiser le z-index
        });
        
        // Slide actif (centre)
        slides[currentIndex].classList.add('active');
        
        // Slide précédent
        const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
        slides[prevIndex].classList.add('prev');
        
        // Slide suivant
        const nextIndex = (currentIndex + 1) % slides.length;
        slides[nextIndex].classList.add('next');
        
        // Slide avant-précédent (2 positions à gauche)
        const prevPrevIndex = (currentIndex - 2 + slides.length) % slides.length;
        slides[prevPrevIndex].classList.add('prevPrev');
        
        // Slide après-suivant (2 positions à droite)
        const nextNextIndex = (currentIndex + 2) % slides.length;
        slides[nextNextIndex].classList.add('nextNext');

        // Masquer les autres slides (ceux qui n'ont pas de classe spécifique)
        slides.forEach((slide, i) => {
            if (!slide.classList.contains('active') && 
                !slide.classList.contains('prev') && 
                !slide.classList.contains('next') && 
                !slide.classList.contains('prevPrev') && 
                !slide.classList.contains('nextNext')) {
                slide.style.opacity = '0';
                slide.style.zIndex = '0';
            }
        });

        // Réinitialiser l'état agrandi
        isEnlarged = false;

        console.log("Classes appliquées aux slides");
    };
    
    // Fonction pour lancer le défilement automatique
    const startAutoScroll = () => {
        if (autoScrollInterval) clearInterval(autoScrollInterval);
        autoScrollInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % slides.length;
            updateCarousel();
        }, AUTO_SCROLL_DELAY);
    };

    // Fonction pour arrêter temporairement le défilement automatique
    const pauseAutoScroll = () => {
        if (autoScrollInterval) clearInterval(autoScrollInterval);
        if (autoScrollTimeout) clearTimeout(autoScrollTimeout);
        autoScrollTimeout = setTimeout(() => {
            startAutoScroll();
        }, AUTO_SCROLL_PAUSE);
    };

    // Initialiser le carrousel
    updateCarousel();
    startAutoScroll();

    // Ajouter un événement de clic pour agrandir la slide active
    track.addEventListener('click', (event) => {
        const isMobile = window.matchMedia('(max-width: 576px)').matches;
        const activeSlide = slides[currentIndex];
        if (activeSlide.contains(event.target)) {
            if (!isEnlarged) {
                activeSlide.classList.add('enlarged');
                isEnlarged = true;
            } else {
                activeSlide.classList.remove('enlarged');
                isEnlarged = false;
            }
            pauseAutoScroll();
        }
    });
    
    // Écouteurs d'événements pour les boutons
    if (prevButton) {
        prevButton.addEventListener('click', (e) => {
            e.stopPropagation();
            currentIndex = (currentIndex - 1 + slides.length) % slides.length;
            updateCarousel();
            pauseAutoScroll();
        });
    } else {
        console.error("Bouton précédent non trouvé");
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', (e) => {
            e.stopPropagation();
            currentIndex = (currentIndex + 1) % slides.length;
            updateCarousel();
            pauseAutoScroll();
        });
    } else {
        console.error("Bouton suivant non trouvé");
    }
    
    // Support tactile amélioré pour mobiles
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let touchStartTime = 0;
    
    const handleTouchStart = (event) => {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
        touchStartTime = Date.now();
    };
    
    const handleTouchMove = (event) => {
        if (isEnlarged) return; // Ne pas permettre le défilement si une image est agrandie
        
        touchEndX = event.touches[0].clientX;
        touchEndY = event.touches[0].clientY;
        
        // Calculer la distance horizontale et verticale
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;
        
        // Si le défilement est plus horizontal que vertical
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Empêcher le défilement de la page
            event.preventDefault();
        }
    };
    
    const handleTouchEnd = () => {
        if (isEnlarged) return; // Ne pas changer de slide si une image est agrandie
        
        const touchTime = Date.now() - touchStartTime;
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;
        
        // S'assurer que le mouvement était principalement horizontal
        if (Math.abs(diffX) > Math.abs(diffY)) {
            const threshold = 30; // Seuil minimal de déplacement
            const speedThreshold = 300; // Temps maximal pour considérer comme un swipe rapide
            
            // Swipe rapide ou déplacement suffisant
            if ((Math.abs(diffX) > threshold && touchTime < speedThreshold) || Math.abs(diffX) > 80) {
                if (diffX > 0) {
                    // Swipe gauche -> slide suivant
                    currentIndex = (currentIndex + 1) % slides.length;
                    updateCarousel();
                } else {
                    // Swipe droit -> slide précédent
                    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
                    updateCarousel();
                }
                pauseAutoScroll();
            }
        }
    };
    
    track.addEventListener('touchstart', handleTouchStart, { passive: false });
    track.addEventListener('touchmove', handleTouchMove, { passive: false });
    track.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Désactiver le pinch-zoom sur le carrousel
    track.addEventListener('gesturestart', (e) => {
        e.preventDefault();
    });
    
    // Arrêter le défilement auto si la souris entre dans le carrousel (desktop)
    track.addEventListener('mouseenter', pauseAutoScroll);
    track.addEventListener('mouseleave', startAutoScroll);

    console.log("Carrousel initialisé avec succès");
};

// Parallax Tilt Effect Cards
// by
// abubakersaeed.netlify.com | @AbubakerSaeed96
// ============================================

// Inspiration:
// Tilt.js: https://gijsroge.github.io/tilt.js/
// Andy Merskin's parallax depth cards pen: https://codepen.io/andymerskin/full/XNMWvQ/

// Thank You for Viewing

class parallaxTiltEffect {

    constructor({element, tiltEffect}) {
  
      this.element = element;
      this.container = this.element.querySelector(".container");
      this.size = [300, 360];
      [this.w, this.h] = this.size;
  
      this.tiltEffect = tiltEffect;
      this.mouseOnComponent = false;
      
      // Variables pour le throttling et l'animation
      this.lastUpdate = 0;
      this.updateRate = 5; // Mise à jour tous les 5ms pour plus de fluidité
      this.transitionActive = false;
  
      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.handleMouseEnter = this.handleMouseEnter.bind(this);
      this.handleMouseLeave = this.handleMouseLeave.bind(this);
      this.defaultStates = this.defaultStates.bind(this);
      this.setProperty = this.setProperty.bind(this);
      this.updateTransform = this.updateTransform.bind(this);
      this.init = this.init.bind(this);
  
      this.init();
    }
  
    handleMouseMove(event) {
      const now = Date.now();
      // Limite la fréquence de mise à jour pour optimiser la performance
      if (now - this.lastUpdate < this.updateRate) return;
      this.lastUpdate = now;
      
      const {offsetX, offsetY} = event;
      const rect = this.container.getBoundingClientRect();
      
      // Calculer la position relative du curseur par rapport au centre (en %)
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Calculer la distance en pourcentage par rapport au centre (-1 à 1)
      let X = (offsetX - centerX) / centerX;
      let Y = (offsetY - centerY) / centerY;
  
      // Inverser la direction selon l'effet désiré
      if (this.tiltEffect === "reverse") {
        X = X * 1; // Pas besoin d'inverser X pour reverse
        Y = Y * -1; // Inverser Y pour reverse
      }
      else if (this.tiltEffect === "normal") {
        X = X * -1; // Inverser X pour normal
        Y = Y * 1; // Pas besoin d'inverser Y pour normal
      }
  
      // Amplifier l'effet et limiter les valeurs extrêmes
      X = X * 12; // Amplification plus importante
      Y = Y * 12; // Amplification plus importante
      
      // Limiter les valeurs extrêmes
      X = Math.max(Math.min(X, 12), -12);
      Y = Math.max(Math.min(Y, 12), -12);
  
      // Mettre à jour les transformations
      this.updateTransform(X, Y);
    }
    
    updateTransform(X, Y) {
      // Appliquer les transformations avec requestAnimationFrame pour plus de fluidité
      requestAnimationFrame(() => {
        this.setProperty('--rY', X.toFixed(2));
        this.setProperty('--rX', Y.toFixed(2));
  
        // Ajustement de l'arrière-plan proportionnel au degré de tilt
        // Réduit le mouvement du fond pour qu'il soit cohérent avec le tilt
        const backgroundX = 50 + (X * 0.7); // Mouvement réduit à 70% du tilt
        const backgroundY = 80 + (Y * 0.7); // Mouvement réduit à 70% du tilt
    
        this.setProperty('--bY', backgroundY + '%');
        this.setProperty('--bX', backgroundX + '%');
      });
    }
  
    handleMouseEnter() {
      this.mouseOnComponent = true;
      
      // Activer la transition pour l'entrée de souris
      if (!this.transitionActive) {
        this.container.style.transition = "transform 0.2s ease-out, background-position 0.2s ease-out";
        this.transitionActive = true;
        
        // Enlever la transition après un certain délai pour que les mouvements soient fluides
        setTimeout(() => {
          this.container.style.transition = "transform 0.05s ease-out";
          this.transitionActive = false;
        }, 200);
      }
      
      this.container.classList.add("container--active");
    }
  
    handleMouseLeave() {
      this.mouseOnComponent = false;
      
      // Réactiver la transition pour la sortie de souris
      this.container.style.transition = "transform 0.2s ease-out, background-position 0.2s ease-out";
      this.transitionActive = true;
      
      setTimeout(() => {
        this.transitionActive = false;
      }, 200);
      
      this.defaultStates();
    }
  
    defaultStates() {
      this.container.classList.remove("container--active");
      this.updateTransform(0, 0);
    }
  
    setProperty(p, v) {
      return this.container.style.setProperty(p, v);
    }
  
    init() {
      this.element.addEventListener('mousemove', this.handleMouseMove);
      this.element.addEventListener('mouseenter', this.handleMouseEnter);
      this.element.addEventListener('mouseleave', this.handleMouseLeave);
    }
  }
  
  const $ = e => document.querySelector(e);
  const $$ = e => document.querySelectorAll(e);