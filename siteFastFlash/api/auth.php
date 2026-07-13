<?php
// Activer l'affichage des erreurs pour le débogage
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'vendor/autoload.php';
use \Firebase\JWT\JWT;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Créer un fichier de log
function writeLog($message) {
    $logFile = __DIR__ . '/../logs/auth.log';
    if (!is_dir(dirname($logFile))) {
        mkdir(dirname($logFile), 0777, true);
    }
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// En haut du fichier, après les headers
writeLog("Méthode HTTP reçue: " . $_SERVER['REQUEST_METHOD']);
writeLog("Action demandée: " . ($_GET['action'] ?? 'non spécifiée'));

// Gérer les requêtes OPTIONS explicitement
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(200);
    exit;
}

// Clé secrète pour JWT (à mettre dans un fichier de configuration)
define('JWT_SECRET', 'votre_clé_secrète_très_longue_et_complexe');
define('JWT_EXPIRATION', 3600); // 1 heure

// Fonction pour lire le fichier users.json
function readUsers() {
    $filePath = __DIR__ . '/../data/users.json';
    writeLog("Tentative de lecture du fichier: $filePath");
    
    if (!file_exists($filePath)) {
        if (!is_dir(dirname($filePath))) {
            mkdir(dirname($filePath), 0777, true);
        }
        file_put_contents($filePath, json_encode(['users' => []]));
        writeLog("Création du fichier users.json");
    }
    
    $content = file_get_contents($filePath);
    writeLog("Contenu lu: " . $content);
    return json_decode($content, true) ?: ['users' => []];
}

// Fonction pour sauvegarder dans users.json
function saveUsers($users) {
    $filePath = __DIR__ . '/../data/users.json';
    writeLog("Tentative de sauvegarde dans: $filePath");
    $result = file_put_contents($filePath, json_encode(['users' => $users], JSON_PRETTY_PRINT));
    writeLog("Résultat de la sauvegarde: " . ($result ? "succès" : "échec"));
    return $result;
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_ARGON2ID);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

function generateToken($user) {
    $issuedAt = time();
    $expire = $issuedAt + JWT_EXPIRATION;

    $payload = [
        'iss' => 'fastflash.fr',
        'aud' => 'fastflash.fr',
        'iat' => $issuedAt,
        'exp' => $expire,
        'user_id' => $user['id'],
        'email' => $user['email']
    ];

    return JWT::encode($payload, JWT_SECRET, 'HS256');
}

function verifyToken($token) {
    try {
        $decoded = JWT::decode($token, JWT_SECRET, ['HS256']);
        return (array) $decoded;
    } catch (Exception $e) {
        return false;
    }
}

// Vérifier que c'est bien une requête POST pour /register
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action'])) {
    writeLog("Traitement de la requête POST pour l'action: " . $_GET['action']);
    
    // Lire les données JSON
    $jsonInput = file_get_contents('php://input');
    writeLog("Données reçues: " . $jsonInput);
    
    if (empty($jsonInput)) {
        writeLog("Aucune donnée reçue");
        http_response_code(400);
        echo json_encode(['error' => 'Aucune donnée reçue']);
        exit;
    }

    $data = json_decode($jsonInput, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        writeLog("Erreur de décodage JSON: " . json_last_error_msg());
        http_response_code(400);
        echo json_encode(['error' => 'JSON invalide']);
        exit;
    }

    if (isset($_GET['action']) && $_GET['action'] === 'register') {
        writeLog("Action: register");
        
        if (!isset($data['email']) || !isset($data['password'])) {
            writeLog("Données manquantes");
            http_response_code(400);
            echo json_encode(['error' => 'Données manquantes']);
            exit;
        }

        // Lire les utilisateurs existants
        $usersData = readUsers();
        $users = $usersData['users'];
        
        // Vérifier si l'email existe déjà
        foreach ($users as $user) {
            if ($user['email'] === $data['email']) {
                writeLog("Email déjà utilisé: " . $data['email']);
                http_response_code(409);
                echo json_encode(['error' => 'Email déjà utilisé']);
                exit;
            }
        }

        // Créer le nouvel utilisateur
        $newUser = [
            'id' => uniqid(),
            'email' => $data['email'],
            'password' => password_hash($data['password'], PASSWORD_DEFAULT),
            'name' => '',
            'phone' => '',
            'address' => '',
            'subscription' => 'none',
            'orders' => [],
            'created_at' => date('c')
        ];

        writeLog("Nouvel utilisateur créé: " . json_encode($newUser));

        // Ajouter le nouvel utilisateur
        $users[] = $newUser;
        
        // Sauvegarder dans le fichier
        if (!saveUsers($users)) {
            writeLog("Erreur lors de la sauvegarde");
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de la sauvegarde']);
            exit;
        }

        // Préparer la réponse (sans le mot de passe)
        $responseUser = $newUser;
        unset($responseUser['password']);

        // Envoyer la réponse
        $response = json_encode([
            'success' => true,
            'user' => $responseUser
        ]);
        
        writeLog("Réponse envoyée: " . $response);
        echo $response;
        exit;
    }
}

// Si on arrive ici, c'est que la requête n'est pas valide
writeLog("Requête non valide");
http_response_code(405);
echo json_encode(['error' => 'Méthode non autorisée']);
?> 