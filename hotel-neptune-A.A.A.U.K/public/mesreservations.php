<?php
include_once '../database.php';

if (!isset($_SESSION['email'])) {
    header("Location: login.php");
    exit();
}

$email = $_SESSION['email'];

$sql = 'SELECT r.reservation_id, r.date_debut, r.date_fin, c.numero_ch, c.type_ch, c.prix_dep
        FROM reservation r
        JOIN chambres c ON r.numero_ch = c.numero_ch
        WHERE r.email = :email';
$stmt = $pdo->prepare($sql);
$stmt->execute([':email' => $email]);
$reservations = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mes Réservations - Hôtel</title>
    <link rel="stylesheet" href="stylesheet/mesreservations.css"> 
</head>
<body>
    <?php include 'header.php'; ?>
    <header>
        <h1>Mes Réservations</h1>
    </header>

    <div class="reservations">
        <?php if ($reservations): ?>
            <table>
                <thead>
                    <tr>
                        <th>Numéro de Chambre</th>
                        <th>Type de Chambre</th>
                        <th>Date de Début</th>
                        <th>Date de Fin</th>
                        <th>Prix par Nuit</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($reservations as $reservation): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($reservation['numero_ch']); ?></td>
                            <td><?php echo htmlspecialchars($reservation['type_ch']); ?></td>
                            <td><?php echo htmlspecialchars($reservation['date_debut']); ?></td>
                            <td><?php echo htmlspecialchars($reservation['date_fin']); ?></td>
                            <td><?php echo htmlspecialchars($reservation['prix_dep']); ?>€</td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php else: ?>
            <p>Vous n'avez aucune réservation pour le moment.</p>
        <?php endif; ?>
    </div>
</body>
</html>