-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : database
-- Généré le : lun. 09 déc. 2024 à 18:21
-- Version du serveur : 10.6.19-MariaDB
-- Version de PHP : 8.2.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `app`
--

-- --------------------------------------------------------

--
-- Structure de la table `chambres`
--

CREATE TABLE `chambres` (
  `numero_ch` int(11) NOT NULL,
  `type_ch` enum('silver','gold','diamond') NOT NULL,
  `description` text DEFAULT NULL,
  `prix_dep` decimal(10,2) NOT NULL,
  `capacite` int(11) NOT NULL,
  `statut` enum('libre','reserve') DEFAULT 'libre'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `paiements`
--

CREATE TABLE `paiements` (
  `paiement_id` int(11) NOT NULL,
  `reservation_id` int(11) NOT NULL,
  `montant` decimal(10,2) NOT NULL,
  `moyen_paiement` enum('carte bancaire','paypal','virement bancaire') NOT NULL,
  `statut` enum('effectué','en attente','échoué') DEFAULT 'en attente',
  `date_paiement` date DEFAULT curdate()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `reservation`
--

CREATE TABLE `reservation` (
  `reservation_id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `numero_ch` int(11) NOT NULL,
  `date_debut` date NOT NULL,
  `duree` int(11) NOT NULL COMMENT 'durée de la location en jours',
  `statut` enum('en attente','confirmée','annulée') DEFAULT 'en attente',
  `date_reservation` date DEFAULT curdate()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `reservation_services`
--

CREATE TABLE `reservation_services` (
  `reservation_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `quantite` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `services`
--

CREATE TABLE `services` (
  `id_serv` int(11) NOT NULL,
  `nom_serv` varchar(50) NOT NULL,
  `description_serv` text DEFAULT NULL,
  `prix_serv` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `nom` varchar(50) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `telephone` varchar(15) DEFAULT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `role` enum('client','admin','staff') DEFAULT 'client'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `chambres`
--
ALTER TABLE `chambres`
  ADD PRIMARY KEY (`numero_ch`),
  ADD UNIQUE KEY `numero_chambre` (`numero_ch`);

--
-- Index pour la table `paiements`
--
ALTER TABLE `paiements`
  ADD PRIMARY KEY (`paiement_id`),
  ADD KEY `reservation_id` (`reservation_id`);

--
-- Index pour la table `reservation`
--
ALTER TABLE `reservation`
  ADD PRIMARY KEY (`reservation_id`),
  ADD KEY `numéro_ch` (`numero_ch`),
  ADD KEY `numero_ch` (`numero_ch`),
  ADD KEY `numero_ch_2` (`numero_ch`),
  ADD KEY `email` (`email`),
  ADD KEY `email_2` (`email`,`numero_ch`);

--
-- Index pour la table `reservation_services`
--
ALTER TABLE `reservation_services`
  ADD PRIMARY KEY (`reservation_id`,`service_id`),
  ADD KEY `service_id` (`service_id`),
  ADD KEY `reservation_id` (`reservation_id`);

--
-- Index pour la table `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id_serv`);

--
-- Index pour la table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`email`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `paiements`
--
ALTER TABLE `paiements`
  MODIFY `paiement_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `reservation`
--
ALTER TABLE `reservation`
  MODIFY `reservation_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `services`
--
ALTER TABLE `services`
  MODIFY `id_serv` int(11) NOT NULL AUTO_INCREMENT;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `paiements`
--
ALTER TABLE `paiements`
  ADD CONSTRAINT `paiements_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservation` (`reservation_id`);

--
-- Contraintes pour la table `reservation`
--
ALTER TABLE `reservation`
  ADD CONSTRAINT `ch_resa` FOREIGN KEY (`numero_ch`) REFERENCES `chambres` (`numero_ch`),
  ADD CONSTRAINT `usr_resa` FOREIGN KEY (`email`) REFERENCES `users` (`email`);

--
-- Contraintes pour la table `reservation_services`
--
ALTER TABLE `reservation_services`
  ADD CONSTRAINT `reservation_services_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservation` (`reservation_id`),
  ADD CONSTRAINT `reservation_services_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id_serv`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
