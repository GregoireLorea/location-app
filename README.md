# 🏢 Location Manager

Application de gestion de location de matériel avec interface web moderne.

## 🚀 Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Démarrer l'application
./start.sh
# ou
npm start
```

## 📋 Accès

- **Formulaire public** : http://localhost:3000/formulaire-location.html
- **Administration** : http://localhost:3000/login.html
- **Identifiants** : `admin` / `admin123`

## 🎯 Fonctionnalités

### Interface publique
- Formulaire de demande de location sans authentification
- Sélection multiple d'articles avec photos
- Vérification de disponibilité en temps réel
- Calcul automatique des prix et cautions

### Interface d'administration
- Gestion complète du stock (CRUD)
- Upload et gestion des photos d'articles
- Suivi des réservations et disponibilités
- Calendrier des locations
- Dashboard avec indicateurs

### API et intégrations
- Endpoints publics pour les demandes externes
- Import webhook JSON, email, CSV
- API REST complète
- Gestion sécurisée des sessions

## 📁 Structure

```
├── index.js              # Serveur Express principal
├── package.json           # Dépendances
├── start.sh              # Script de démarrage
├── data/
│   ├── stock.json        # Données du stock
│   └── locations.json    # Données des locations
└── public/
    ├── index.html        # Dashboard admin
    ├── login.html        # Authentification
    ├── stock.html        # Gestion du stock
    ├── locations.html    # Gestion des locations
    ├── calendar.html     # Calendrier
    ├── formulaire-location.html  # Formulaire public
    ├── style.css         # Styles
    ├── auth.js          # Authentification JS
    └── uploads/         # Images des articles
```

## 🔧 Configuration

### Variables d'environnement
- `PORT` : Port du serveur (défaut: 3000)
- `NODE_ENV` : Environnement (development/production)

### Sécurité
- Sessions Express avec secret key
- Mots de passe hachés avec bcrypt
- Protection des routes admin
- Upload sécurisé des images

## 🛠️ Technologies

- **Backend** : Node.js, Express, Multer
- **Frontend** : HTML5, CSS3, JavaScript vanilla
- **Authentification** : express-session, bcrypt
- **Stockage** : JSON files (extensible vers base de données)

## 📝 License

MIT
