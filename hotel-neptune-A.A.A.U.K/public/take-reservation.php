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
if (!isset($_POST['numero_ch'])) {
    header('Location: chambres.php');
    exit();
}
$numero_ch=$_POST['numero_ch'];
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accueil | Hôtel-Neptune</title>
    <link rel="stylesheet" href="stylesheet/take-reservation_style.css">
    <script>
        function ajusterDateFin() {
            const dateDebut = document.getElementById('date_fin').value;
            const dateFin = document.getElementById('date_debut');
            
            if (dateDebut) {
                const dateMin = new Date(dateDebut);
                dateMin.setDate(dateMin.getDate() + 2); // Ajouter 2 jours
                dateFin.min = dateMin.toISOString().split('T')[0];
                
                if (dateFin.value && new Date(dateFin.value) < dateMin) {
                    dateFin.value = dateFin.min; // Ajuster la date de fin si nécessaire
                }
            }
        }
        function initialiserDateReservation() {
            const dateReservation = document.getElementById('date_reservation');
            const maintenant = new Date();
            const dateLocale = maintenant.toISOString().slice(0, 16); // Format YYYY-MM-DDTHH:MM
            dateReservation.value = dateLocale;
            dateReservation.min = dateLocale; // Interdire une date passée
            dateReservation.max = dateLocale;
        }

        window.onload = function() {
            initialiserDateReservation();
        };
    </script>
</head>
<body>
    <?php
        $sql = 'SELECT * FROM chambres WHERE numero_ch = ?';
        $requette = $pdo->prepare($sql);
        $requette->execute([$numero_ch]);
        $result = $requette->fetchAll();
        if ($result)
        {
            foreach($result as $chambre)
            {
                echo '<div class="chambre">';
                echo '  <h3>Chambre N° '.$chambre['numero_ch'].'</h3>';
                echo '  <div class="img">';
                echo '      <img src="images/'.$chambre['img_ch'].'">';
                echo '  </div>';
                echo '  <div class="text">';  
                echo '      <p>Capacité : <span class="spe-txt">'.$chambre['capacite'].'</span> personne(s)</p>';
                echo '      <p class="desc">'.$chambre['description'].'</p>';
                echo '      <p>A partir de <span class="spe-txt">'.$chambre['prix_dep'].'€</span> / nuit</p>';
                echo '  </div>';
            }
        }else{
            echo "<p>Cette chambre est actuellement indisponible.</p>";
        }
    ?>
    <form action="traitement-reserve.php" method="POST">
        <input name="numero_ch" type="hidden" value="<?php $chambre['numero_ch'] ?>">
        <p>Date du début du séjour : <input name="date_debut" id="date_fin" type="date" onchange="ajusterDateFin()" required></p>
        <p>Date de fin du séjour : <input name="date_fin" id="date_debut" type="date" onchange="ajusterDateFin()" required></p>
        <p>Date de réservation : <input type="datetime-local" id="date_reservation" name="date_reservation"></p>
        <button type="submit">Confirmer ma réservation</button>
    </form>
    </div>
</body>
</html>