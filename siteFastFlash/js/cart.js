class Cart {
    constructor() {
        this.items = [];
        this.init();
        this.setupEventListeners();
    }

    init() {
        // Charger le panier depuis le localStorage en fonction de l'utilisateur connecté
        const userId = auth.currentUser ? auth.currentUser.id : 'guest';
        const savedCart = localStorage.getItem(`cart_${userId}`);
        if (savedCart) {
            try {
                this.items = JSON.parse(savedCart);
                // Vérifier que chaque item a toutes les propriétés nécessaires
                this.items = this.items.filter(item => 
                    item.name && 
                    item.price && 
                    item.volume && 
                    item.quantity
                );
                this.save(); // Resauvegarder le panier nettoyé
            } catch (error) {
                console.error('Erreur lors du chargement du panier:', error);
                this.items = [];
            }
        }
        // S'assurer que l'interface est mise à jour après l'initialisation
        setTimeout(() => this.updateUI(), 0);
    }

    setupEventListeners() {
        // Gérer la fermeture du panier
        const closeCart = document.querySelector('.close-cart');
        if (closeCart) {
            closeCart.addEventListener('click', () => {
                document.querySelector('.cart-modal').classList.remove('active');
            });
        }

        // Gérer le clic sur le bouton du panier
        const cartButton = document.getElementById('cartButton');
        if (cartButton) {
            cartButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (!auth.isLoggedIn) {
                    document.getElementById('login-modal').style.display = 'block';
                } else {
                    document.querySelector('.cart-modal').classList.add('active');
                }
            });
        }
    }

    addItem(cocktail, quantity = 1) {
        const existingItem = this.items.find(item => 
            item.name === cocktail.name && 
            item.volume === cocktail.volume
        );
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({
                name: cocktail.name,
                price: cocktail.price,
                volume: cocktail.volume,
                quantity
            });
        }

        this.save();
        this.updateUI();
    }

    removeItem(itemId) {
        const [name, volume] = itemId.split('_');
        this.items = this.items.filter(item => !(item.name === name && item.volume === volume));
        this.save();
        this.updateUI();
    }

    updateQuantity(itemId, quantity) {
        const [name, volume] = itemId.split('_');
        const item = this.items.find(item => item.name === name && item.volume === volume);
        if (item) {
            item.quantity = quantity;
            if (quantity <= 0) {
                this.removeItem(itemId);
            } else {
                this.save();
                this.updateUI();
            }
        }
    }

    getTotal() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    save() {
        const userId = auth.currentUser ? auth.currentUser.id : 'guest';
        try {
            localStorage.setItem(`cart_${userId}`, JSON.stringify(this.items));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du panier:', error);
        }
    }

    updateUI() {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            // N'afficher le nombre d'items que si l'utilisateur est connecté
            cartCount.textContent = auth.isLoggedIn ? this.items.reduce((total, item) => total + item.quantity, 0) : '0';
        }
        
        const cartItems = document.querySelector('.cart-items');
        if (cartItems) {
            if (!auth.isLoggedIn) {
                cartItems.innerHTML = '<p class="cart-login-message">Connectez-vous pour voir votre panier</p>';
                return;
            }
            
            cartItems.innerHTML = this.items.length ? this.items.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>${item.price}€ x ${item.quantity} (${item.volume})</p>
                    </div>
                    <div class="cart-item-actions">
                        <button onclick="cart.updateQuantity('${item.name}_${item.volume}', ${item.quantity - 1})" class="quantity-btn">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="cart.updateQuantity('${item.name}_${item.volume}', ${item.quantity + 1})" class="quantity-btn">+</button>
                        <button onclick="cart.removeItem('${item.name}_${item.volume}')" class="remove-item" title="Supprimer">×</button>
                    </div>
                </div>
            `).join('') : '<p>Votre panier est vide</p>';

            const cartTotal = document.querySelector('.cart-total');
            if (cartTotal) {
                if (!auth.isLoggedIn) {
                    cartTotal.innerHTML = `
                        <div class="total">Total: <span>0€</span></div>
                        <p class="login-warning">Connectez-vous pour commander</p>
                        <button class="login-button" onclick="document.getElementById('login-modal').style.display='block'; document.querySelector('.cart-modal').classList.remove('active');">Se connecter</button>
                    `;
                } else {
                    cartTotal.innerHTML = `
                        <div class="total">Total: <span>${this.getTotal()}€</span></div>
                        <button class="checkout-button" ${this.items.length ? '' : 'disabled'}>Commander</button>
                    `;
                }
            }
        }

        // Mettre à jour l'aperçu du panier dans la page compte
        const cartPreview = document.querySelector('.cart-preview');
        if (cartPreview) {
            cartPreview.innerHTML = !auth.isLoggedIn ? '<p>Connectez-vous pour voir votre panier</p>' :
                (this.items.length ? this.items.map(item => `
                    <div class="cart-preview-item">
                        <h4>${item.name}</h4>
                        <p>${item.price}€ x ${item.quantity} (${item.volume})</p>
                    </div>
                `).join('') : '<p>Votre panier est vide</p>');
        }
    }

    // Méthode pour fusionner le panier invité avec le panier utilisateur lors de la connexion
    mergeGuestCart() {
        const guestCart = JSON.parse(localStorage.getItem('cart_guest') || '[]');
        if (guestCart.length > 0) {
            guestCart.forEach(item => {
                this.addItem({ name: item.name, volume: item.volume }, item.quantity);
            });
            localStorage.removeItem('cart_guest');
        }
    }

    clear() {
        this.items = [];
        this.save();
        this.updateUI();
    }
} 