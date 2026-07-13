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
    <div class="container" id="login-container">
        <h2>Connexion</h2>
        <form id="login-form" method="POST">
            <input type="hidden" name="action" value="login">
            <label for="email-login">E-mail</label>
            <input type="email" id="email-login" name="email" placeholder="Entrez votre e-mail" value="ugoduplan83@gmail.com"required>
            
            <label for="password-login">Mot de passe</label>
            <input type="password" id="password-login" name="mot_de_passe" placeholder="Entrez votre mot de passe" value="password" required>
            <?php global $wrongpass; if ($wrongpass==true):?>
                <p class = "message">Email ou mot de passe incorrect.</p>
                <style>
                    .message{
                        color: rgb(217, 12, 12);
                        font-size: 0.8rem;
                        margin-bottom: 1rem;
                    }
                </style>
            <?php endif?>
            <button type="submit">Se connecter</button>
        </form>
        <div class="switch">
            <p>Pas encore inscrit ? <a href="register.php">Créer un compte</a></p>
        </div>
    </div>
    <?php
    include 'footer.php';
    ?>
</body>
</html>