<?php
    require_once __DIR__ . '/../database.php';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accueil | Hôtel-Neptune</title>
    <link rel="stylesheet" href="stylesheet/index_style.css">
</head>
<body>
    <?php
        include 'header.php';  
    ?>
    <header>
        <div class="image">
            <img id='img1'alt="Deventure Hotel-Neptune" src="images/banniere_fond.png">
            <img alt="Deventure Hotel-Neptune" src="images/banniere_fond2.png">
            <img alt="Vue en hauteur de l'hotel" src="images/hotel_vue_ciel.jpg">
        </div>
        <div class="text">
            <p>Bienvenue chez vous</p>
            <h1>Hôtel Neptune </h1>
            <h3>⭐⭐⭐⭐⭐</h3>
            <h2>HOTEL | SPA | SOINS</h2>
            <a href="chambres.php">
                <div class="button">
                    RESERVER
                </div>
            </a>
        </div>
    </header>
    <section class="presentation">
        <div class="text">
            <h2>Bienvenue chez vous, Hôtel Neptune, Hôtel aux milles coutumes </h2>
            <p>L'Hôtel dispose de différents soins, massages, thérapies…, ainsi que des spas, des piscines et jacuzzis, centres de bien être et salles de sport mis à votre disposition 24h/24 pour votre plus grand confort. Des bars et des serveurs sont également présents pour répondre à vos moindres besoins.</p>
        </div>
        <div class="image">
            <img src="images/presentation_terrasse.png">
        </div>
    </section>
    <section class="accomodations">
        <h2>Accomodations</h2>
            <div class="propositions">
            <?php
            $requette = $pdo->query("SELECT * FROM chambres");
            $result = $requette->fetchAll();
            if ($result)
            {
                for ($i=0;$i<3;$i++)
                {
                    echo '<div class="chambre">';
                    echo '<div class="image">';
                    echo '<img src="images/'.$result[$i]['img_ch'].'">';
                    echo '</div>';
                    echo '<div class="text">';
                    echo '<p>Suite '.$result[$i]['type_ch'].'</p>';
                    echo '<p>'.$result[$i]['capacite'].' personnes</p>';
                    echo '<p>'.$result[$i]['prix_dep'].' €</p>';
                    echo '</div>';
                    echo '</div>';
                }
            }
            ?>
        </div>
    </section>
    <?php
    include_once 'footer.php';
    ?>
</body>
</html>
