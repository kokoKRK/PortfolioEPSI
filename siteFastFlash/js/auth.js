class Auth {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.token = localStorage.getItem('token');
        this.init();
    }

    async init() {
        if (this.token) {
            try {
                const response = await this.makeAuthRequest('verify');
                if (response.ok) {
                    const data = await response.json();
                    this.currentUser = data.user;
                    this.updateUI();
                } else {
                    this.logout();
                }
            } catch (error) {
                this.logout();
            }
        }
    }

    async makeAuthRequest(endpoint, data = null) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return fetch(`api/auth.php?action=${endpoint}`, {
            method: data ? 'POST' : 'GET',
            headers,
            body: data ? JSON.stringify(data) : null
        });
    }

    async login(email, password) {
        try {
            const response = await this.makeAuthRequest('login', { email, password });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            const data = await response.json();
            this.token = data.token;
            this.currentUser = data.user;
            
            localStorage.setItem('token', this.token);
            this.updateUI();
        } catch (error) {
            throw error;
        }
    }

    async register(email, password) {
        try {
            const response = await fetch('api/auth.php?action=register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            if (!response.ok) {
                console.error('Erreur serveur:', data);
                throw new Error(data.error || 'Erreur lors de l\'inscription');
            }

            // Stocker l'utilisateur dans le localStorage et mettre à jour l'état
            this.currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            
            // Mettre à jour l'interface
            this.updateUI();
            
            // Fermer la modal d'inscription
            document.getElementById('register-modal').style.display = 'none';

            return data.user;
        } catch (error) {
            console.error('Erreur d\'inscription:', error);
            throw error;
        }
    }

    async updateUserInfo(updatedInfo) {
        try {
            const response = await this.makeAuthRequest('update', updatedInfo);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            const data = await response.json();
            this.currentUser = data.user;
            this.updateUI();
        } catch (error) {
            throw error;
        }
    }

    logout() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('token');
        this.updateUI();
    }

    isLoggedIn() {
        return this.currentUser !== null && this.token !== null;
    }

    updateUI() {
        const loginButton = document.getElementById('loginButton');
        const registerButton = document.getElementById('registerButton');
        const accountButton = document.getElementById('accountButton');
        const logoutButton = document.getElementById('logoutButton');

        if (this.currentUser) {
            loginButton.style.display = 'none';
            registerButton.style.display = 'none';
            accountButton.style.display = 'block';
            logoutButton.style.display = 'block';
            const subscriptionBadge = document.getElementById('account-subscription');
            if (subscriptionBadge) {
                const subscription = this.currentUser.subscription || 'none';
                subscriptionBadge.textContent = {
                    'none': 'Aucun',
                    'duo': 'Duo',
                    'five': 'Five'
                }[subscription];
                subscriptionBadge.className = `subscription-badge ${subscription}`;
            }
        } else {
            loginButton.style.display = 'block';
            registerButton.style.display = 'block';
            accountButton.style.display = 'none';
            logoutButton.style.display = 'none';
        }
    }
} 