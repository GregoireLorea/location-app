# 🎪 Location Manager - Application de Gestion de Location

Une application web complète pour gérer vos locations de matériel événementiel, avec interface moderne et intégration automatique des demandes.

## 🚀 Fonctionnalités principales

### 📦 Gestion du Stock
- **CRUD complet** : Ajouter, modifier, supprimer des articles
- **Catégorisation** : Organiser le matériel par catégories
- **Informations détaillées** : Prix, caution, description, emplacement
- **Suivi des quantités** : Stock disponible et réservé
- **Alertes stock faible** : Notifications pour réapprovisionner

### 📅 Gestion des Locations
- **Planification avancée** : Dates et heures de début/fin précises
- **Vérification de disponibilité** : Contrôle automatique des conflits
- **Statuts de location** :
  - `planned` : Réservation confirmée
  - `ongoing` : Location en cours
  - `finished` : Location terminée
- **Informations client complètes** : Contact, association, préférences
- **Calcul automatique** : Prix total avec durée et livraison

### 🗓️ Calendrier Visuel
- **Vue mensuelle/hebdomadaire** : Planning complet avec FullCalendar
- **Filtres avancés** : Par article, statut, période
- **Codes couleur** : Visualisation rapide des statuts
- **Détails en popup** : Informations complètes au clic
- **Planning détaillé** : Vue par semaine avec résumé

### 📝 Formulaire Public de Demande
- **Interface moderne** : Design responsive et professionnel
- **Sélection multiple** : Choisir plusieurs matériels simultanément
- **Vérification temps réel** : Disponibilité immédiate
- **Gestion des quantités** : Ajustement par matériel
- **Informations complètes** : Contact, association, commentaires
- **Envoi automatique** : Intégration directe dans le système

### 🔗 Intégrations et Webhooks
- **Endpoint webhook** : `/webhook/email` pour intégrations externes
- **Import CSV** : Depuis WPForms ou autres sources
- **API REST complète** : Toutes les opérations en JSON
- **Format flexible** : Support de multiples formats de données

### 📊 Dashboard et Analytics
- **Statistiques en temps réel** :
  - Stock total et disponible
  - Locations actives
  - Revenus du mois
  - Prochaines échéances
- **Locations récentes** : Activité récente
- **Actions rapides** : Accès direct aux fonctions principales

## 🛠️ Technologies utilisées

### Backend
- **Node.js** + **Express.js** : Serveur web rapide et moderne
- **JSON Files** : Stockage simple et portable
- **CORS** : Support cross-origin
- **Body Parser** : Traitement des requêtes

### Frontend
- **HTML5** + **CSS3** : Interface moderne et responsive
- **JavaScript ES6+** : Fonctionnalités avancées
- **FullCalendar** : Composant calendrier professionnel
- **Fetch API** : Communications asynchrones

### Fonctionnalités avancées
- **Vérification de disponibilité** : Algorithme de conflit en temps réel
- **Gestion multi-matériel** : Sélection et réservation multiples
- **Responsive design** : Compatible mobile/tablette/desktop
- **Messages de validation** : Feedback utilisateur complet

## 📁 Structure du projet

```
location-app/
├── index.js                 # Serveur Express principal
├── package.json            # Dépendances Node.js
├── stock.json              # Base de données stock
├── locations.json          # Base de données réservations
└── public/
    ├── index.html          # Dashboard principal
    ├── stock.html          # Gestion du stock
    ├── locations.html      # Gestion des locations
    ├── calendar.html       # Calendrier visuel
    ├── formulaire-location.html # Formulaire public
    ├── validation.html     # Import/validation
    └── style.css          # Styles globaux
```

## 🔌 API Endpoints

### Stock
- `GET /stock` - Liste du matériel
- `POST /stock` - Ajouter un article
- `PUT /stock/:id` - Modifier un article
- `DELETE /stock/:id` - Supprimer un article

### Locations
- `GET /locations` - Liste des réservations
- `POST /locations` - Créer une réservation
- `PUT /locations/:id` - Modifier une réservation
- `DELETE /locations/:id` - Supprimer une réservation
- `PUT /locations/:id/start` - Démarrer une location
- `PUT /locations/:id/finish` - Terminer une location

### Webhooks et Import
- `POST /webhook/email` - Recevoir des demandes externes
- `POST /webhook/wpforms` - Intégration WPForms
- `POST /import/csv` - Import depuis fichier CSV

## 🚀 Installation et Démarrage

### Prérequis
- Node.js (v14+)
- npm ou yarn

### Installation
```bash
# Cloner le projet
git clone [url-du-repo]
cd location-app

# Installer les dépendances
npm install

# Démarrer le serveur
node index.js
```

### Accès
- **Interface principale** : http://localhost:3000
- **Formulaire public** : http://localhost:3000/formulaire-location.html
- **API** : http://localhost:3000/api/*

## 🎯 Cas d'usage

### Pour les professionnels
- **Sociétés d'événementiel** : Gestion complète du matériel
- **Associations** : Suivi des prêts et locations
- **Prestataires techniques** : Planning et facturation

### Fonctionnalités métier
- **Éviter les conflits** : Vérification automatique de disponibilité
- **Optimiser la planification** : Vue calendrier complète
- **Automatiser la saisie** : Formulaire public + webhooks
- **Suivre la rentabilité** : Calculs automatiques et statistiques

## 🔧 Configuration

### Personnalisation
- **Catégories** : Modifier dans le code selon vos besoins
- **Prix et cautions** : Gestion par article
- **Statuts** : Système de workflow configurable
- **Design** : CSS personnalisable

### Intégrations
- **WPForms** : Configuration webhook direct
- **Zapier** : Via endpoint `/webhook/email`
- **Autres CRM** : API REST standard

## 📈 Évolutions possibles

### Fonctionnalités futures
- **Base de données** : Migration vers PostgreSQL/MySQL
- **Authentification** : Système multi-utilisateurs
- **Facturation** : Génération PDF automatique
- **Notifications** : Email/SMS automatiques
- **Géolocalisation** : Suivi des livraisons
- **Reporting** : Analytics avancées

### Intégrations avancées
- **Stripe/PayPal** : Paiements en ligne
- **Google Calendar** : Synchronisation calendrier
- **API externes** : ERP, comptabilité
- **Mobile app** : Application native

## 🐛 Support et Maintenance

### Logs et Monitoring
- **Console** : Logs serveur en temps réel
- **Erreurs** : Gestion des exceptions
- **Performance** : Optimisations continues

### Backup et Sécurité
- **Sauvegarde** : Fichiers JSON exportables
- **Validation** : Contrôles de saisie
- **CORS** : Sécurité cross-origin

## 📄 Licence

MIT License - Libre d'utilisation et modification

---

**Développé avec ❤️ pour simplifier la gestion de vos locations**
