<?php
require_once __DIR__ . '/../database.php';

if ($_SESSION['role']!='admin') {
    header("Location: index.php");
    exit();
}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $reservation_id = $_POST['reservation_id'];
    $email=$_POST['email'];
    $numero_ch=$_POST['numero_ch'];
    $lastNumero_ch=$_POST['lastNumero_ch'];
    $date_debut=$_POST['date_debut'];
    $date_fin=$_POST['date_fin'];
    $date_reservation=$_POST['date_reservation'];
    $checkRoomQuery = $pdo->prepare("SELECT 1 FROM chambres WHERE numero_ch = ?");
    $checkRoomQuery->execute([$numero_ch]);
    $roomExists = $checkRoomQuery->fetch();
    if (!$roomExists) {                                 //test si la chambre changée existe
        header("Location: reservations-clients.php?error=room_not_found");
        exit();
    }
    $query = $pdo->query("SELECT numero_ch FROM reservation"); 
    $result= $query->fetchAll();
    foreach($result as $chambre){
        if ($chambre['numero_ch']==$numero_ch) {                    //test si la chambre changée est déja réservée
            header("Location: reservations-clients.php?lastNumero_ch=$lastNumero_ch&numero_ch=$numero_ch");
            exit();
        }
    }
    $query = $pdo->prepare("UPDATE reservation SET numero_ch = ? WHERE reservation_id = ?");    //changement dans le bdd
    $query->execute([$numero_ch,$reservation_id]);
    header('Location: reservations-clients.php');
}
