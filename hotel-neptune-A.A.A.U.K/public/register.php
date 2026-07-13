<?php
include 'auth2.php';
if (isset($_SESSION['email'])){
    header('Location: logout.php');
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connexion/Inscription | Hôtel-Neptune</title>
    <link rel="stylesheet" href="stylesheet/login_style.css">
</head>
<body>
    <?php
        include 'header.php';
    ?>
    <div class="container" id="signup-container">
        <h2>Inscription</h2>
        <form id="signup-form" method="POST">
            <input type="hidden" name="action" value="register">
            <label for="firstname">Prénom</label>
            <input type="text" id="firstname" name="firstname" placeholder="Entrez votre prénom" value="ugo" required>
            
            <label for="lastname">Nom</label>
            <input type="text" id="lastname" name="lastname" placeholder="Entrez votre nom" value="grinda" required>
            
            <label for="phone">Téléphone</label>
            <input type="tel" id="phone" name="phone" placeholder="Entrez votre numéro de téléphone" value="0686696497" required pattern="[0-9]{10}">
            
            <label for="email-signup">E-mail</label>
            <input type="email" id="email-signup" name="email" placeholder="Entrez votre e-mail" value="ugoduplan83@gmail.com" required>
            <?php global $emailused; if ($emailused==true):?>
                <p class="message">Email déja utilisé</p>
                <style>
                    .message{
                        color: rgb(217, 12, 12);
                        font-size: 0.8rem;
                        margin-bottom: 1rem;
                    }
                </style>
            <?php endif?>
            <label for="password-signup">Mot de passe</label>
            <input type="password" id="password-signup" name="mot_de_passe" placeholder="Entrez votre mot de passe" value="password" required>
            
            <button type="submit">S'inscrire</button>
        </form>
        <div class="switch">
            <p>Déjà inscrit ? <a href="login.php">Se connecter</a></p>
        </div>
    </div>
    <?php
        include 'footer.php';
    ?>
</body>
</html>