<?php
    include_once '../database.php';

    // if (!isset($_SESSION['email'])) {
    //     header('Location: login.php');
    //     exit;
    // }

    $capacite = isset($_GET['capacite']) ? (int)$_GET['capacite'] : 0;
    $type = isset($_GET['type']) ? $_GET['type'] : '';
    $prix_min = isset($_GET['prix_min']) ? (int)$_GET['prix_min'] : 0;
    $prix_max = isset($_GET['prix_max']) ? (int)$_GET['prix_max'] : 0;

    $sql = 'SELECT * FROM chambres WHERE 1=1';
    $params = [];

    if ($capacite > 0) {
        $sql .= ' AND capacite = :capacite';
        $params[':capacite'] = $capacite;
    }

    if (!empty($type)) {
        $sql .= ' AND type_ch = :type';
        $params[':type'] = $type;
    }

    if ($prix_min > 0) {
        $sql .= ' AND prix_dep >= :prix_min';
        $params[':prix_min'] = $prix_min;
    }

    if ($prix_max > 0) {
        $sql .= ' AND prix_dep <= :prix_max';
        $params[':prix_max'] = $prix_max;
    }

    $requette = $pdo->prepare($sql);
    $requette->execute($params);
    $result = $requette->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="stylesheet/room_style.css"/>
    <title>Chambres | Hotel-Neptune</title>
</head>
<body>
    <?php
        include 'header.php';
    ?>
    <header>
        <div class="image">
            <img id = "img1" alt="Deventure Hotel-Neptune" src="images/suite famillial hotel.jpg">
            <img alt="Deventure Hotel-Neptune" src="images/téléchargement.jpg">
            <img alt="Suite symple" src="images/suite_simple.png">
        </div>
        <div class="text">
            <p>Bienvenue chez vous</p>
            <h1>Hôtel Neptune </h1>
            <h3>⭐⭐⭐⭐⭐</h3>
            <h2>NOS CHAMBRES</h2>
        </div>
    </header>

        <form id="trie" method="GET" action="chambres.php">
            <div class="grp">
                <label for="capacite">Capacité : </label>
                <input type="number" name="capacite" id="capacite" min="1" placeholder="Nombre de personnes">
            </div>
            
            <div class="grp">
                <label for="type">Type de chambre : </label>
                <select name="type" id="type">
                    <option value="">Tous</option>
                    <option value="silver">silver</option>
                    <option value="gold">gold</option>
                    <option value="diamond">diamond</option>
                </select>
            </div>
            
            <div class="grp">
                <label for="prix_min">Prix minimum : </label>
                <input type="number" name="prix_min" id="prix_min" min="0" placeholder="Prix minimum">
            </div>

            <div class="grp">
                <label for="prix_max">Prix maximum : </label>
                <input type="number" name="prix_max" id="prix_max" min="0" placeholder="Prix maximum">
            </div>

            <button type="submit">Filtrer</button>
        </form>

    <div class="chambres">  
        <?php
        if ($result)
        {
            foreach($result as $chambre)
            {
                echo '<div class="chambre">';
                echo '  <h3>Chambre N°' . htmlspecialchars($chambre['numero_ch']) . '</h3>';
                echo '  <div class="image">';
                echo '      <img src="images/' . htmlspecialchars($chambre['img_ch']) . '" alt="' . htmlspecialchars($chambre['numero_ch']) . '">';
                echo '  </div>';
                echo '  <div class="text">';
                echo '      <p>Suite <span class="spe-txt">' . htmlspecialchars($chambre['type_ch']) . '</span></p>';
                echo '      <p>Capacité : <span class="spe-txt">' . htmlspecialchars($chambre['capacite']) . '</span> personne(s)</p>';
                // echo '      <p>' . htmlspecialchars($chambre['description']) . '</p>';
                echo '      <p>A partir de <span class="spe-txt">' . htmlspecialchars($chambre['prix_dep']) . '€</span> / nuit</p>';
                echo '<form action="take-reservation.php" method="POST"><button name="numero_ch" type="submit" value="'.$chambre['numero_ch'].'">Commencer ma réservation</button>';
                echo '  </div>';
                echo '</div>';
            }
        }else{
            echo "<p>Il n'y a pas de chambres disponibles pour le moment.</p>";
        }
        ?>
    </div>
    <?php
    include 'footer.php';
    ?>
</body>
</html>
