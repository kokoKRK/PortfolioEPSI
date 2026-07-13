<?php
require_once __DIR__ . '/../database.php';

if (!isset($_SESSION['email'])){
    header('Location: login.php');
    exit();
}
if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    header('Location: chambres.php');
    exit();
}
if (!isset($_POST['date_debut'])) {
    header('Location: chambres.php');
    exit();
}
$_POST['numero_ch']=intval($_POST['numero_ch']);
try {
    $query = $pdo->prepare("INSERT INTO reservation (email, numero_ch, date_debut, date_fin, date_reservation, statut) VALUES (:email, :numero_ch, :date_debut, :date_fin, :date_reservation,:statut)");
    $query->execute(['email' => $_SESSION['email'],'numero_ch' => $_POST['numero_ch'],'date_debut' => $_POST['date_debut'], 'date_fin' => $_POST['date_fin'], 'date_reservation' => $_POST['date_reservation'],'statut' => 'confirmée']);
    header('Location: mesreservations.php');
} catch (Exception $e) {
    echo "<p>Erreur : " . $e->getMessage() . "</p>";
}
