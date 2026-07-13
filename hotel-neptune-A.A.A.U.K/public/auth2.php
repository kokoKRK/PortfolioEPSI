<?php
// Configuration de la base de données
require_once __DIR__ . '/../database.php';
// Vérifier si une action est demandée
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'register') {
        // Inscription d'un utilisateur
        $nom = trim($_POST['lastname'] ?? '');
        $prenom = trim($_POST['firstname'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $mot_de_passe = trim($_POST['mot_de_passe'] ?? '');
        $tel= trim($_POST['phone']);

        if ($nom && $prenom && $email && $mot_de_passe && $tel) {
            try {
                // Vérifier si l'email existe déjà
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
                $stmt->execute([$email]);
                if ($stmt->fetchColumn() > 0) {
                    $emailused=true;
                } else {
                    $emailused=false;
                    // Hachage du mot de passe
                    $hashed_password = password_hash($mot_de_passe, PASSWORD_DEFAULT);

                    // Insertion dans la base de données
                    $stmt = $pdo->prepare("INSERT INTO users (nom, prenom, email, mot_de_passe,telephone) VALUES (?, ?, ?, ?, ?)");
                    $stmt->execute([$nom, $prenom, $email, $hashed_password, $tel]);
            
                    // Redirection vers la page du profil ou une autre page
                    header("Location: login.php");
                    exit;
                }
            } catch (Exception $e) {
                echo "<p>Erreur : " . $e->getMessage() . "</p>";
            }
        } else {
            echo "<p>Veuillez remplir tous les champs.</p>";
        }
    } elseif ($action === 'login') {
        // Connexion d'un utilisateur
        $email = trim($_POST['email'] ?? '');
        $mot_de_passe = trim($_POST['mot_de_passe'] ?? '');

        if ($email && $mot_de_passe) {
            try {
                // Récupérer les informations de l'utilisateur
                $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
                $stmt->execute([$email]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($user && password_verify($mot_de_passe, $user['mot_de_passe'])) {
                    $wrongpass=false;
                    // Créer une session pour l'utilisateur
                    $_SESSION['email'] = $user['email'];
                    $_SESSION['prenom'] = $user['prenom'];
                    $_SESSION['nom'] = $user['nom'];
                    $_SESSION['tel'] = $user['telephone'];
                    $_SESSION['role']=$user['role'];
                    // Redirection vers la page du profil ou une autre page
                    header("Location: index.php");
                    exit;
                } else {
                    $wrongpass=true;
                }
            } catch (Exception $e) {
                echo "<p>Erreur : " . $e->getMessage() . "</p>";
            }
        } else {
            echo "<p>Veuillez remplir tous les champs.</p>";
        }
    }
}