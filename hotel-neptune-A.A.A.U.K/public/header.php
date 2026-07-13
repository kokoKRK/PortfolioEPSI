<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="stylesheet/header_style.css">
</head>
<body>
    <nav id='nav_bar'>
        <div class="left_nav">
            <div class="logo">
                <a class='lien_nav' href="index.php"><img src="images/logo.png" alt="Hôtel Neptune Logo"></a>
            </div>
            <div class="pages">
                <ul>
                    <li><a class='lien_nav' href="index.php">Accueil</a></li>
                    <li><a class='lien_nav' href="chambres.php">Nos Chambres</a></li>
                    <li><a class='lien_nav' href="services.php">Nos Services</a></li>
                    <li><a class='lien_nav' href="info.php">Informations</a></li>
                </ul>
            </div>
        </div>
        <div class="user">
            <ul>
                <?php if (isset($_SESSION['email'])): ?>
                    <?php if (isset($_SESSION['role']) && $_SESSION['role'] == 'admin'): ?>
                        <li><a class='lien_nav' href="reservations-clients.php">Réservation Clients</a></li>
                        <span id="barre">|</span>
                        <li><a class='lien_nav' href="logout.php">Se déconnecter</a></li>
                    <?php endif; ?>
                    <?php if (isset($_SESSION['role']) && $_SESSION['role'] == 'client'): ?>
                        <li><a class='lien_nav' href="mesreservations.php">Mes Réservations</a></li>
                        <span id="barre">|</span>
                        <li><a class='lien_nav' href="logout.php">Se déconnecter</a></li>
                    <?php endif; ?>
                <?php else: ?>
                    <li><a class='lien_nav' href="login.php">Se connecter</a></li>
                    <span id="barre">|</span>
                    <li><a class='lien_nav' href="register.php">S'enregistrer</a></li>
                <?php endif; ?>
            </ul>
        </div>
    </nav>
</body>
</html>