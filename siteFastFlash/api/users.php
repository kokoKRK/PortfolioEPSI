<?php
header('Content-Type: application/json');

// Vérifier la méthode HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit;
}

// Récupérer les données JSON
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!isset($data['users'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Données invalides']);
    exit;
}

// Chemin vers le fichier users.json
$file = '../data/users.json';

// Sauvegarder les données
try {
    $success = file_put_contents($file, json_encode(['users' => $data['users']], JSON_PRETTY_PRINT));
    
    if ($success === false) {
        throw new Exception('Erreur lors de l\'écriture du fichier');
    }
    
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?> 