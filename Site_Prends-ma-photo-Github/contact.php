<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Sécurité et nettoyage
    $firstname = htmlspecialchars(trim($_POST["firstname"]));
    $lastname = htmlspecialchars(trim($_POST["lastname"]));
    $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
    $phone = htmlspecialchars(trim($_POST["phone"]));
    $sujet = htmlspecialchars(trim($_POST["sujet"]));
    $message = htmlspecialchars(trim($_POST["message"]));

    // Adresse de réception
    $to = "contactprendsmaphoto@gmail.com"; // 🔁 Remplace par l'email de destination

    $subject = "📩 Nouveau message - Formulaire Prends ma Photo";
    $body = "Vous avez reçu un nouveau message via le formulaire de contact :\n\n";
    $body .= "Prénom : $firstname\n";
    $body .= "Nom : $lastname\n";
    $body .= "Email : $email\n";
    $body .= "Téléphone : $phone\n";
    $body .= "Sujet : $sujet\n\n";
    $body .= "Message :\n$message";

    $headers = "From: $email\r\n";
    $headers .= "Reply-To: $email\r\n";

    // Envoi de l'email
    if (mail($to, $subject, $body, $headers)) {
        echo "<script>alert('Votre message a bien été envoyé.'); window.history.back();</script>";
    } else {
        echo "<script>alert('Erreur lors de l\\'envoi du message.'); window.history.back();</script>";
    }
} else {
    // Rediriger si la page est accédée directement
    header("Location: index.html");
    exit;
}
?>
