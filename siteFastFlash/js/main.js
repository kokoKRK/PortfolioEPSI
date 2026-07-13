const auth = new Auth();
const cart = new Cart();
const offers = new Offers();

document.addEventListener('DOMContentLoaded', async function() {
    let cocktailsData = {};
    const modal = document.getElementById('cocktail-modal');
    const closeModal = document.querySelector('#cocktail-modal .close-modal');
    const modalImage = document.getElementById('modal-image');
    const modalName = document.getElementById('modal-name');
    const modalType = document.getElementById('modal-type');
    const modalIngredientsList = document.getElementById('modal-ingredients-list');
    const modalDescription = document.getElementById('modal-description-text');

    // Fonction pour nettoyer la modal
    function cleanModal() {
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = '';
        }
    }

    // Fonction pour fermer la modal
    function closeModalHandler() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Gestionnaires d'événements pour la modal
    closeModal.addEventListener('click', closeModalHandler);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModalHandler();
    });

    // Fonction openModal
    function openModal(cocktail) {
        const cocktailName = cocktail.querySelector('h3').textContent;
        const cocktailData = cocktailsData[cocktailName];
        if (!cocktailData) return;

        // Nettoyer la modal d'abord
        cleanModal();

        modalImage.src = cocktail.querySelector('img').src;
        modalImage.alt = cocktail.querySelector('img').alt;
        modalName.textContent = cocktailName;
        modalType.textContent = cocktailData.type;
        
        modalIngredientsList.innerHTML = cocktailData.ingredients
            .map(ingredient => `<li>${ingredient}</li>`)
            .join('');
        
        modalDescription.textContent = cocktailData.description;
        
        // Créer un conteneur pour le prix et le bouton
        const priceActionContainer = document.createElement('div');
        priceActionContainer.className = 'modal-price-action';
        
        // Définir le volume par défaut
        let selectedVolume = '50cl';
        
        // Créer le sélecteur de volume
        const volumeSelector = document.createElement('div');
        volumeSelector.className = 'volume-selector';
        volumeSelector.innerHTML = `
            <div class="volume-option selected" data-volume="50cl">
                <span class="volume">50cl</span>
                <span class="price">${cocktailData.prices['50cl']}€</span>
            </div>
            <div class="volume-option" data-volume="1L">
                <span class="volume">1L</span>
                <span class="price">${cocktailData.prices['1L']}€</span>
                <span class="savings">-14%</span>
            </div>
        `;

        // Créer le lien de prix
        const priceLink = document.createElement('a');
        priceLink.href = '#offers';
        priceLink.className = 'modal-price';
        priceLink.innerHTML = `<span class="price-label">Prix :</span><span class="price-value">${cocktailData.prices[selectedVolume]}€</span>`;
        
        // Ajouter l'événement pour fermer la modal au clic sur le prix
        priceLink.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });

        // Gérer la sélection du volume
        volumeSelector.querySelectorAll('.volume-option').forEach(option => {
            option.addEventListener('click', () => {
                volumeSelector.querySelectorAll('.volume-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                selectedVolume = option.dataset.volume;
                priceLink.innerHTML = `<span class="price-label">Prix :</span><span class="price-value">${cocktailData.prices[selectedVolume]}€</span>`;
            });
        });

        // Créer le bouton d'ajout au panier
        const addToCartButton = document.createElement('button');
        addToCartButton.textContent = 'Ajouter au panier';
        addToCartButton.classList.add('add-to-cart-button');
        addToCartButton.addEventListener('click', () => {
            cart.addItem({
                name: cocktailName,
                price: cocktailData.prices[selectedVolume],
                volume: selectedVolume
            });
            addToCartButton.textContent = 'Ajouté !';
            setTimeout(() => {
                addToCartButton.textContent = 'Ajouter au panier';
            }, 1000);
        });
        
        // Ajouter les éléments dans l'ordre
        priceActionContainer.appendChild(volumeSelector);
        priceActionContainer.appendChild(priceLink);
        priceActionContainer.appendChild(addToCartButton);
        
        // Ajouter les sections d'ingrédients et de description
        const modalBody = document.querySelector('.modal-body');
        modalBody.appendChild(priceActionContainer);
        modalBody.appendChild(document.createElement('div')).className = 'modal-ingredients';
        modalBody.lastChild.innerHTML = `
            <h4>Ingrédients</h4>
            <ul>${modalIngredientsList.innerHTML}</ul>
        `;
        modalBody.appendChild(document.createElement('div')).className = 'modal-description';
        modalBody.lastChild.innerHTML = `
            <h4>Description</h4>
            <p>${modalDescription.textContent}</p>
        `;
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // Charger les cocktails depuis le fichier JSON
    try {
        console.log('Tentative de chargement des cocktails...');
        const response = await fetch('data/cocktails.json');
        console.log('Réponse reçue:', response);
        
        const cocktails = await response.json();
        console.log('Cocktails chargés:', cocktails);
        
        // Transformer les données pour cocktailsData
        cocktailsData = cocktails.reduce((acc, cocktail) => {
            acc[cocktail.name] = cocktail;
            return acc;
        }, {});

        // Mettre à jour le carousel avec les cocktails
        const track = document.querySelector('.carousel-track');
        track.innerHTML = cocktails.map(cocktail => `
            <div class="carousel-slide ${cocktail.animation?.type === 'hearts' ? 'hearts-animation' : ''} ${cocktail.animation?.type === 'ice' ? 'ice-animation' : ''}" 
                 ${cocktail.animation ? `data-intensity="${cocktail.animation.intensity}"` : ''}
                 style="${cocktail.animation ? `--animation-color: ${cocktail.animation.color};` : ''}">
                ${cocktail.isNew ? '<span class="new-badge">Nouveau !</span>' : ''}
                ${cocktail.animation?.type === 'hearts' ? `
                    <div class="heart-1">♥</div>
                    <div class="heart-2">♥</div>
                    <div class="heart-3">♥</div>
                    <div class="heart-4">♥</div>
                    <div class="heart-5">♥</div>
                    <div class="heart-6">♥</div>
                    <div class="heart-7">♥</div>
                    <div class="heart-8">♥</div>
                    <div class="heart-9">♥</div>
                    <div class="heart-10">♥</div>
                ` : ''}
                ${cocktail.animation?.type === 'ice' ? `
                    <div class="ice-1">❆</div>
                    <div class="ice-2">❆</div>
                    <div class="ice-3">❆</div>
                    <div class="ice-4">❆</div>
                    <div class="ice-5">❆</div>
                    <div class="ice-6">❆</div>
                    <div class="ice-7">❆</div>
                    <div class="ice-8">❆</div>
                    <div class="ice-9">❆</div>
                    <div class="ice-10">❆</div>
                ` : ''}
                <img src="${cocktail.image_url}" alt="${cocktail.name}">
                <h3>${cocktail.name}</h3>
                <span class="cocktail-type">${cocktail.type}</span>
            </div>
        `).join('');

        // Réinitialiser le carousel
        const slides = Array.from(track.children);
        const slidesToAdd = slides.map(slide => slide.cloneNode(true));
        slidesToAdd.forEach(slide => track.appendChild(slide));

        // Réattacher les événements click
        document.querySelectorAll('.carousel-slide').forEach(slide => {
            slide.addEventListener('click', () => openModal(slide));
        });

        // Initialiser le carousel
        initializeCarousel();

    } catch (error) {
        console.error('Erreur détaillée:', error);
        console.error('Stack trace:', error.stack);
    }

    // Fonction d'initialisation du carousel
    function initializeCarousel() {
        const track = document.querySelector('.carousel-track');
        const slides = Array.from(track.children);
        const nextButton = document.querySelector('.carousel-button.next');
        const prevButton = document.querySelector('.carousel-button.prev');
        
        const slideWidth = 320; // Largeur d'un slide
        const slideGap = 30;   // Espacement entre les slides
        const moveDistance = slideWidth + slideGap; // Distance de déplacement
        let currentIndex = 0;
        
        function updateSlidePosition(transition = true) {
            track.style.transition = transition ? 'transform 0.5s ease-in-out' : 'none';
            track.style.transform = `translateX(-${currentIndex * moveDistance}px)`;
        }
        
        function moveToSlide(direction) {
            const slidesCount = slides.length / 2;
            
            if (direction === 'next') {
                currentIndex++;
                updateSlidePosition();
                
                if (currentIndex >= slidesCount) {
                    setTimeout(() => {
                        currentIndex = 0;
                        updateSlidePosition(false);
                    }, 500);
                }
            } else {
                if (currentIndex <= 0) {
                    currentIndex = slidesCount;
                    updateSlidePosition(false);
                    setTimeout(() => {
                        currentIndex--;
                        updateSlidePosition();
                    }, 10);
                } else {
                    currentIndex--;
                    updateSlidePosition();
                }
            }
        }
        
        nextButton.addEventListener('click', () => moveToSlide('next'));
        prevButton.addEventListener('click', () => moveToSlide('prev'));
        
        const autoSlide = setInterval(() => moveToSlide('next'), 3000);
        track.addEventListener('mouseenter', () => clearInterval(autoSlide));
    }

    const mobileMenu = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    
    mobileMenu.addEventListener('click', function() {
        navLinks.classList.toggle('active');
        mobileMenu.classList.toggle('active');
    });

    function handleNavigation(e) {
        const href = this.getAttribute('href');
        
        // Ne pas traiter les liens spéciaux
        if (this.matches('#loginButton, #registerButton, #userButton, #cartButton, #accountButton, #logoutButton')) {
            return;
        }
        
        // Vérifier si c'est un lien d'ancrage valide
        if (href && href.startsWith('#') && href !== '#') {
            e.preventDefault();
            const targetId = href.split('#')[1]; // Récupérer l'ID sans le #
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetSection.offsetTop - navbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Fermer le menu mobile si ouvert
                const navLinks = document.querySelector('.nav-links');
                const mobileMenu = document.querySelector('.mobile-menu');
                if (navLinks && navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    mobileMenu.classList.remove('active');
                }
            }
        }
    }

    // Ajouter l'écouteur d'événements une seule fois pour tous les liens
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', handleNavigation);
    });

    // Gérer séparément les boutons d'authentification
    const loginButton = document.getElementById('loginButton');
    const registerButton = document.getElementById('registerButton');
    const userButton = document.getElementById('userButton');

    if (loginButton) {
        loginButton.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-modal').style.display = 'block';
        });
    }

    if (registerButton) {
        registerButton.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-modal').style.display = 'block';
        });
    }

    if (userButton) {
        userButton.addEventListener('click', (e) => {
            e.preventDefault();
            const dropdown = document.querySelector('.user-dropdown');
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
    }

    document.getElementById('switch-to-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('register-modal').style.display = 'block';
    });

    document.getElementById('switch-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-modal').style.display = 'none';
        document.getElementById('login-modal').style.display = 'block';
    });

    document.getElementById('logoutButton').addEventListener('click', () => {
        auth.logout();
    });

    document.getElementById('cartButton').addEventListener('click', () => {
        const cartModal = document.querySelector('.cart-modal');
        cartModal.classList.add('active');
    });

    const cartModal = document.querySelector('.cart-modal');
    document.querySelector('.close-cart').addEventListener('click', () => {
        cartModal.classList.remove('active');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModalHandler();
    });

    // Gérer la fermeture des modales
    document.querySelectorAll('.auth-modal .close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.auth-modal').style.display = 'none';
        });
    });

    // Gérer la soumission des formulaires
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;

        try {
            auth.login(email, password);
            document.getElementById('login-modal').style.display = 'none';
            form.reset();
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('input[type="email"]').value;
        const passwords = form.querySelectorAll('input[type="password"]');
        
        if (passwords[0].value !== passwords[1].value) {
            alert('Les mots de passe ne correspondent pas');
            return;
        }

        try {
            await auth.register(email, passwords[0].value);
            form.reset();
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById('accountButton').addEventListener('click', (e) => {
        e.preventDefault();
        const accountModal = document.getElementById('account-modal');
        
        // Remplir les informations du compte
        document.getElementById('account-email').value = auth.currentUser.email;
        document.getElementById('account-name').value = auth.currentUser.name || '';
        document.getElementById('account-phone').value = auth.currentUser.phone || '';
        document.getElementById('account-address').value = auth.currentUser.address || '';
        
        // Afficher les commandes
        const ordersList = document.querySelector('.orders-list');
        const orders = JSON.parse(localStorage.getItem(`orders_${auth.currentUser.id}`) || '[]');
        ordersList.innerHTML = orders.length ? orders.map(order => `
            <div class="order-item">
                <div class="order-date">${new Date(order.date).toLocaleDateString()}</div>
                <div class="order-total">Total: ${order.total}€</div>
                <div class="order-status">${order.status}</div>
            </div>
        `).join('') : '<p>Aucune commande pour le moment</p>';
        
        // Afficher le panier actuel
        const cartPreview = document.querySelector('.cart-preview');
        cartPreview.innerHTML = cart.items.length ? cart.items.map(item => `
            <div class="cart-preview-item">
                <h4>${item.name}</h4>
                <p>${item.price}€ x ${item.quantity}</p>
            </div>
        `).join('') : '<p>Votre panier est vide</p>';
        
        accountModal.style.display = 'block';
    });

    // Gérer la sauvegarde des informations du compte
    document.getElementById('account-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const updatedUser = {
            ...auth.currentUser,
            name: document.getElementById('account-name').value,
            phone: document.getElementById('account-phone').value,
            address: document.getElementById('account-address').value,
            subscription: auth.currentUser.subscription || 'none' // Préserver l'abonnement existant
        };
        
        // Mettre à jour les informations dans le localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === auth.currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = updatedUser;
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            auth.currentUser = updatedUser;
            alert('Informations mises à jour avec succès');
        }
    });

    // Ajouter la fermeture de la modale compte
    document.querySelector('#account-modal .close-modal').addEventListener('click', () => {
        document.getElementById('account-modal').style.display = 'none';
    });

    // Ajouter un gestionnaire pour le lien "Voir les offres" dans la modal du compte
    document.querySelector('.subscription-link').addEventListener('click', (e) => {
        e.preventDefault();
        // Fermer la modal du compte
        document.getElementById('account-modal').style.display = 'none';
        // Réactiver le scroll
        document.body.style.overflow = 'auto';
        // Faire défiler jusqu'à la section des offres
        const offersSection = document.querySelector('#offers');
        const navbarHeight = document.querySelector('.navbar').offsetHeight;
        const targetPosition = offersSection.offsetTop - navbarHeight;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    });

    // Gestionnaire pour le bouton Commander
    document.querySelector('.checkout-button').addEventListener('click', () => {
        // Vérifier d'abord si l'utilisateur est connecté
        if (!auth.isLoggedIn()) {
            document.getElementById('login-modal').style.display = 'block';
            document.querySelector('.cart-modal').classList.remove('active');
            return;
        }

        // Vérifier si le panier n'est pas vide
        if (!cart.items.length) {
            alert('Votre panier est vide');
            return;
        }
        
        // Récupérer les éléments nécessaires
        const checkoutModal = document.getElementById('checkout-modal');
        const orderItems = document.querySelector('.order-items');
        const totalAmount = document.querySelector('.total-amount');
        const paymentAmount = document.querySelector('.payment-amount');
        const deliveryDetails = document.querySelector('.delivery-details');
        
        // Afficher les items
        orderItems.innerHTML = cart.items.map(item => `
            <div class="order-item">
                <span>${item.name} (${item.volume}) x${item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(2)}€</span>
            </div>
        `).join('');
        
        // Afficher le total
        const total = cart.getTotal();
        totalAmount.textContent = `${total.toFixed(2)}€`;
        paymentAmount.textContent = `${total.toFixed(2)}€`;
        
        // Afficher les informations de livraison
        deliveryDetails.innerHTML = `
            <p><strong>Nom :</strong> ${auth.currentUser.name || 'Non renseigné'}</p>
            <p><strong>Téléphone :</strong> ${auth.currentUser.phone || 'Non renseigné'}</p>
            <p><strong>Adresse :</strong> ${auth.currentUser.address || 'Non renseignée'}</p>
        `;
        
        // Fermer le panier et afficher la page de paiement
        document.querySelector('.cart-modal').classList.remove('active');
        checkoutModal.style.display = 'block';
    });

    // Ajouter aussi ce gestionnaire pour fermer la modal de paiement
    document.querySelector('#checkout-modal .close-modal').addEventListener('click', () => {
        document.getElementById('checkout-modal').style.display = 'none';
    });

    // Formater automatiquement le numéro de carte
    document.getElementById('card-number').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
        e.target.value = formattedValue.substring(0, 19);
    });

    // Formater automatiquement la date d'expiration
    document.getElementById('card-expiry').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2);
        }
        e.target.value = value.substring(0, 5);
    });

    // Ajouter les gestionnaires pour les boutons d'offre
    document.querySelectorAll('.buy-offer-button').forEach(button => {
        button.addEventListener('click', () => {
            if (!auth.isLoggedIn) {
                document.getElementById('login-modal').style.display = 'block';
                return;
            }
            offers.purchaseOffer(button.dataset.offer);
        });
    });

    // Modifier le gestionnaire de soumission du paiement
    document.getElementById('payment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payButton = e.target.querySelector('button');
        const originalText = payButton.innerHTML;
        payButton.disabled = true;
        payButton.innerHTML = 'Traitement en cours...';
        
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Vérifier si c'est un achat d'offre
        const offerType = e.target.querySelector('input[name="offer-type"]')?.value;
        if (offerType) {
            offers.activateSubscription(offerType);
            alert(`Félicitations ! Votre ${offers.offers[offerType].name} est maintenant active.`);
        } else {
            // Traitement normal d'une commande de cocktails
            const orderId = Date.now();
            const orders = JSON.parse(localStorage.getItem(`orders_${auth.currentUser.id}`) || '[]');
            const total = offers.applyDiscount(cart.getTotal(), auth.currentUser.subscription);
            
            orders.push({
                id: orderId,
                items: cart.items,
                total: total,
                date: new Date(),
                status: 'En préparation'
            });
            localStorage.setItem(`orders_${auth.currentUser.id}`, JSON.stringify(orders));
            cart.clear();
        }

        document.getElementById('checkout-modal').style.display = 'none';
        payButton.disabled = false;
        payButton.innerHTML = originalText;
    });

    // Fermer le dropdown quand on clique ailleurs
    document.addEventListener('click', function(e) {
        if (!e.target.matches('#userButton') && !e.target.closest('.user-dropdown')) {
            document.querySelector('.user-dropdown').style.display = 'none';
        }
    });
}); 