# Guide Docker - Location Manager

## 🐳 Installation et utilisation avec Docker

### Prérequis
- Docker installé
- Docker Compose installé

### Installation rapide Docker (Ubuntu/Debian)
```bash
# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Installer Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Redémarrer la session
logout
```

## 🚀 Utilisation

### Commandes principales
```bash
# Construire l'application
./docker-manage.sh build

# Démarrer l'application
./docker-manage.sh start

# Voir les logs
./docker-manage.sh logs

# Arrêter l'application
./docker-manage.sh stop

# Voir le statut
./docker-manage.sh status

# Nettoyer complètement
./docker-manage.sh clean
```

### Démarrage rapide
```bash
# 1. Construire et démarrer
./docker-manage.sh build
./docker-manage.sh start

# 2. Accéder à l'application
# http://localhost:3000
```

## 🌐 Déploiement sur serveur

### Option 1: Serveur simple
```bash
# Sur votre serveur
git clone votre-repo
cd location-app
./docker-manage.sh build
./docker-manage.sh start
```

### Option 2: Avec Nginx (production)
```bash
# Déploiement avec reverse proxy
./docker-manage.sh deploy
```

### Option 3: Avec domaine personnalisé
1. Pointez votre domaine vers le serveur
2. Configurez SSL (Let's Encrypt recommandé)
3. Modifiez `nginx.conf` avec votre domaine
4. Redémarrez avec `./docker-manage.sh deploy`

## 🔧 Configuration

### Variables d'environnement
Modifiez `.env.docker` pour :
- EMAIL_USER : votre email Gmail
- EMAIL_PASS : mot de passe d'application Gmail
- ADMIN_EMAIL : email admin
- SESSION_SECRET : clé secrète (générez-en une unique)

### Volumes persistants
- `./data` : Base de données JSON
- `./public/uploads` : Images uploadées

## 📊 Monitoring

### Logs en temps réel
```bash
./docker-manage.sh logs
```

### Status des conteneurs
```bash
./docker-manage.sh status
```

### Ressources utilisées
```bash
docker stats
```

## 🔒 Sécurité

### Certificat SSL avec Let's Encrypt
```bash
# Installer certbot
sudo apt install certbot

# Générer certificat
sudo certbot certonly --standalone -d votre-domaine.com

# Copier les certificats
sudo cp /etc/letsencrypt/live/votre-domaine.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/votre-domaine.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*.pem

# Décommenter les lignes SSL dans nginx.conf
# Redémarrer
./docker-manage.sh deploy
```

## 🚀 Déploiement sur VPS/Cloud

### DigitalOcean, Linode, AWS EC2...
1. Créer un serveur Ubuntu 20.04+
2. Installer Docker et Docker Compose
3. Cloner le repository
4. Configurer les variables d'environnement
5. Lancer `./docker-manage.sh deploy`

### Configuration domaine O2Switch
1. Dans cPanel O2Switch, créer un sous-domaine
2. Pointer vers l'IP de votre serveur (enregistrement A)
3. Ou utiliser une redirection vers http://votre-serveur-ip:3000

## 🔧 Développement

### Mode développement
```bash
# Monter le code source (pour dev)
docker run -it --rm \
  -p 3000:3000 \
  -v $(pwd):/app \
  -w /app \
  node:20-alpine \
  npm start
```

### Debugging
```bash
# Accéder au conteneur
docker exec -it location-manager_location-app_1 sh

# Voir les fichiers
docker exec -it location-manager_location-app_1 ls -la /app/data
```

## 📋 Troubleshooting

### Port déjà utilisé
```bash
# Changer le port dans docker-compose.yml
ports:
  - "8080:3000"  # Utiliser 8080 au lieu de 3000
```

### Permissions fichiers
```bash
# Fixer les permissions
sudo chown -R $USER:$USER data public/uploads
```

### Rebuild complet
```bash
./docker-manage.sh clean
./docker-manage.sh build
./docker-manage.sh start
```
