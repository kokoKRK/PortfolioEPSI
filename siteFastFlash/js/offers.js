class Offers {
    constructor() {
        this.offers = {
            five: {
                name: "Offre Five",
                price: 10,
                description: "Tous vos Flashs à 5€ en illimité",
                type: "subscription",
                benefits: "Accès illimité à tous nos cocktails pour seulement 5€ l'unité"
            },
            duo: {
                name: "Offre Duo",
                price: 15,
                description: "1 Flash acheté = 1 Flash offert",
                type: "subscription",
                benefits: "Profitez de vos cocktails à deux pour le prix d'un"
            },
            group: {
                name: "Pack Groupe",
                price: 50,
                description: "Pack de 10 Flashs",
                type: "oneTime",
                benefits: "Idéal pour vos soirées entre amis"
            }
        };
    }

    applyDiscount(total, subscription) {
        switch (subscription) {
            case 'five':
                // Tous les cocktails à 5€
                return total * (5 / total);
            case 'duo':
                // 1 acheté = 1 offert (50% de réduction)
                return total * 0.5;
            default:
                return total;
        }
    }

    purchaseOffer(offerType) {
        if (!auth.isLoggedIn) {
            alert('Veuillez vous connecter pour acheter une offre');
            return;
        }

        const offer = this.offers[offerType];
        if (!offer) return;

        // Simuler le paiement de l'offre
        const checkoutModal = document.getElementById('checkout-modal');
        const orderItems = document.querySelector('.order-items');
        const totalAmount = document.querySelector('.total-amount');
        const paymentAmount = document.querySelector('.payment-amount');
        const deliveryDetails = document.querySelector('.delivery-details');

        orderItems.innerHTML = `
            <div class="order-item">
                <span>${offer.name}</span>
                <span>${offer.price}€</span>
            </div>
        `;

        totalAmount.textContent = `${offer.price}€`;
        paymentAmount.textContent = `${offer.price}€`;

        deliveryDetails.innerHTML = `
            <p><strong>Nom :</strong> ${auth.currentUser.name || 'Non renseigné'}</p>
            <p><strong>Téléphone :</strong> ${auth.currentUser.phone || 'Non renseigné'}</p>
            <p><strong>Adresse :</strong> ${auth.currentUser.address || 'Non renseignée'}</p>
        `;

        // Ajouter un champ caché pour identifier que c'est un achat d'offre
        const paymentForm = document.getElementById('payment-form');
        let offerInput = paymentForm.querySelector('input[name="offer-type"]');
        if (!offerInput) {
            offerInput = document.createElement('input');
            offerInput.type = 'hidden';
            offerInput.name = 'offer-type';
            paymentForm.appendChild(offerInput);
        }
        offerInput.value = offerType;

        checkoutModal.style.display = 'block';
    }

    activateSubscription(offerType) {
        const user = auth.currentUser;
        user.subscription = offerType;
        
        // Mettre à jour dans le localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            users[userIndex] = user;
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('currentUser', JSON.stringify(user));
            auth.currentUser = user;
        }
    }
} 