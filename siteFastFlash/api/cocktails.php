<?php
header('Content-Type: application/json');
require_once '../config/database.php';

$db = new Database();
$cocktails = $db->getCocktails();

// Ajouter des logs pour le débogage
error_log('Cocktails bruts : ' . print_r($cocktails, true));

// Si les cocktails sont dans une propriété "cocktails", on les extrait
if (isset($cocktails['cocktails'])) {
    $cocktails = $cocktails['cocktails'];
}

error_log('Cocktails après traitement : ' . print_r($cocktails, true));
echo json_encode($cocktails);
?> 