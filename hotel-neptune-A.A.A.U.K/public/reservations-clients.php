<?php
require_once __DIR__ . '/../database.php';

if ($_SESSION['role']!='admin') {
    // Si l'utilisateur n'est pas connecté, redirection vers la page de connexion
    header("Location: index.php");
    exit();
}

// L'utilisateur est connecté, afficher le profil
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réservations clients | Hôtel-Neptune</title>
    <link rel="stylesheet" href="stylesheet/reservations-clients_style.css">
</head>
<body>
    <?php
        include 'header.php';  
    ?>
    <header>
        <h2>Réservations des clients</h2>
    </header>
    <?php  
        if (isset($_GET['error']) && $_GET['error']=='room_not_found'){
            echo '<pclass="error">Impossible de modifier la réservation : la chambre est introuvable</p>';
        }
    ?>
    <section class="reservations">
        <div class="all-reservations">           
            <?php
            //objectif -> avec email afficher prenom/nom du client de la reservation
            $sql = "SELECT * FROM users,reservation WHERE users.email=reservation.email AND statut = 'confirmée'";
            $requette = $pdo->query($sql);
            $result = $requette->fetchAll();
            if ($result)
            { 
                foreach($result as $reservation)
                {
                    echo '<div class="reservation">';
                    echo '<form id="modificationForm" method="post" action="edit-reservation.php">';
                    echo '<h3>Reservation n°'.$reservation['reservation_id'].'<input name="reservation_id" type="hidden" value="'.$reservation['reservation_id'].'"></h3>';
                    echo '<ul>';
                    echo '<li><p>Email :'.$reservation['email'].'</p></li>';
                    echo '<li><p>Numéro de chambre : '.$reservation['numero_ch'].'</p></li>';
                    echo '<input name="lastNumero_ch" type="hidden" min="1" max="30" value="'.$reservation['numero_ch'].'">';
                    echo '<li><p>Date de début : <input name="date_debut" id="date_fin" type="date" placeholder="Date de début" value="'.$reservation['date_debut'].'"></p></li>';
                    echo '<li><p>Date de fin : <input name="date_fin" id="date_debut" type="date" placeholder="Date de fin" value="'.$reservation['date_fin'].'"></p></li>';
                    echo '<li><p>Statut : '.$reservation['statut'].'</p></li>';
                    echo '<li><p>Date de réservation : '.$reservation['date_reservation'].'</p></li>';
                    echo '</ul>';
                    echo '<h3>Client</h3>';
                    echo '<ul>';
                    echo '<li><p>Email : '.$reservation['email'].'</p></li>';
                    echo '<li><p>Nom : '.$reservation['nom'].'</p></li>';
                    echo '<li><p>Prenom : '.$reservation['prenom'].'</p></li>';
                    echo '<li><p>Téléphone : '.$reservation['telephone'].'</p></li>';
                    echo '<li><p>Rôle : '.$reservation['role'].'</p></li>';
                    echo '</ul>';
                    if (isset($_GET['lastNumero_ch']) && $_GET['lastNumero_ch']==$reservation['numero_ch']){
                           echo '<p class="error">Impossible de modifier la réservation : la chambre '.$_GET['numero_ch'].' est déjà réservée</p>';
                    }
                    echo '<div class="button">';
                    echo "<button class='modif-button' onclick='confirmerModification()'>Modifier la réservation</button>";
                    echo "<button onclick='confirmerAnnulation()'>Supprimer la réservation</button>";
                    echo '</div>';
                    echo '</form>';
                    echo '</div>';
                }
            }else{
                echo "<p>Il n'y a aucune réservation actuelement.</p>";
            }
            ?>
        </div>
    </section>
    <script>
        function confirmerAnnulation() {
            // Récupère la variable PHP dans un script JS
            const reservation_id = "<?php echo $reservation['reservation_id']; ?>";
            // Affiche un pop-up de confirmation
            const confirmation = confirm("Êtes-vous sûr de vouloir suprimer cette réservation ?");
            
            if (confirmation) {
                // Si l'utilisateur clique sur OK
                window.location.href = "delete-reservation.php?reservation_id=" + encodeURIComponent(reservation_id);
                // Ici, vous pouvez ajouter un traitement comme une redirection ou un envoi au serveur
            } else {
                // Si l'utilisateur clique sur Annuler
                alert("La réservation n'a pas été annulé");
            }
        }
        function confirmerModification() {
                // Intercepter la soumission du formulaire
            document.getElementById('modificationForm').addEventListener('submit', function(event) {
                // Empêcher la soumission initiale du formulaire
                event.preventDefault();

                // Afficher une boîte de confirmation
                const confirmation = confirm("Êtes-vous sûr de vouloir modifier cette réservation ?");
                
                if (confirmation) {
                    // Si l'utilisateur confirme, soumettre le formulaire
                    this.submit();
                } else {
                    // Sinon, afficher un message (facultatif)
                    window.location.href = "reservations-clients.php";
                }
            });
        }
    </script>
</body>
</html>