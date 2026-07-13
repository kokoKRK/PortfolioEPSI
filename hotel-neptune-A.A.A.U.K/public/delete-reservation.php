<?php
require_once __DIR__ . '/../database.php';

if ($_SESSION['role']!='admin') {
    header("Location: index.php");
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $reservation_id = $_GET['reservation_id'];
    try {
        // Vérifier si l'email existe déjà
        $stmt = $pdo->prepare("DELETE FROM reservation WHERE reservation.reservation_id = ?");
        $stmt->execute([$reservation_id]);
        header('Location: reservations-clients.php');
        exit();
    } catch (Exception $e) {
        echo "<p>Erreur : " . $e->getMessage() . "</p>";
    }
}






?>