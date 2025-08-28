#!/bin/bash

# Script de gestion Docker pour Location Manager
# Utilisation: ./docker-manage.sh [build|start|stop|restart|logs|clean|deploy]

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_NAME="location-manager"
IMAGE_NAME="location-manager:latest"

function show_help() {
    echo -e "${BLUE}Gestion Docker - Location Manager${NC}"
    echo "================================"
    echo ""
    echo "Utilisation: $0 [commande]"
    echo ""
    echo "Commandes disponibles:"
    echo "  build     - Construire l'image Docker"
    echo "  start     - Démarrer l'application"
    echo "  stop      - Arrêter l'application"
    echo "  restart   - Redémarrer l'application"
    echo "  logs      - Voir les logs"
    echo "  status    - Voir le statut"
    echo "  clean     - Nettoyer (arrêter et supprimer)"
    echo "  deploy    - Déployer en production avec Nginx"
    echo "  help      - Afficher cette aide"
}

function build_image() {
    echo -e "${BLUE}🔨 Construction de l'image Docker...${NC}"
    docker build -t $IMAGE_NAME .
    echo -e "${GREEN}✅ Image construite avec succès!${NC}"
}

function start_app() {
    echo -e "${BLUE}🚀 Démarrage de l'application...${NC}"
    
    # Créer les dossiers s'ils n'existent pas
    mkdir -p data public/uploads
    
    # Initialiser les fichiers JSON s'ils n'existent pas
    if [ ! -f "data/stock.json" ]; then
        echo "[]" > data/stock.json
    fi
    if [ ! -f "data/locations.json" ]; then
        echo "[]" > data/locations.json
    fi
    
    docker-compose up -d location-app
    echo -e "${GREEN}✅ Application démarrée!${NC}"
    echo -e "${YELLOW}🌐 Accès: http://localhost:3000${NC}"
}

function stop_app() {
    echo -e "${BLUE}🛑 Arrêt de l'application...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ Application arrêtée!${NC}"
}

function restart_app() {
    echo -e "${BLUE}🔄 Redémarrage de l'application...${NC}"
    stop_app
    start_app
}

function show_logs() {
    echo -e "${BLUE}📋 Logs de l'application:${NC}"
    docker-compose logs -f location-app
}

function show_status() {
    echo -e "${BLUE}📊 Statut des conteneurs:${NC}"
    docker-compose ps
    echo ""
    echo -e "${BLUE}📊 Utilisation des ressources:${NC}"
    docker stats --no-stream $(docker-compose ps -q) 2>/dev/null || echo "Aucun conteneur en cours d'exécution"
}

function clean_all() {
    echo -e "${BLUE}🧹 Nettoyage complet...${NC}"
    docker-compose down -v --remove-orphans
    docker image rm $IMAGE_NAME 2>/dev/null || true
    echo -e "${GREEN}✅ Nettoyage terminé!${NC}"
}

function deploy_production() {
    echo -e "${BLUE}🚀 Déploiement en production avec Nginx...${NC}"
    
    # Construire l'image
    build_image
    
    # Démarrer avec Nginx
    docker-compose --profile production up -d
    
    echo -e "${GREEN}✅ Déploiement en production terminé!${NC}"
    echo -e "${YELLOW}🌐 Accès HTTP: http://localhost${NC}"
    echo -e "${YELLOW}🔒 Accès HTTPS: https://localhost (configurez SSL)${NC}"
}

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    echo -e "${YELLOW}📥 Installez Docker: https://docs.docker.com/get-docker/${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    echo -e "${YELLOW}📥 Installez Docker Compose: https://docs.docker.com/compose/install/${NC}"
    exit 1
fi

# Traitement des arguments
case ${1:-help} in
    build)
        build_image
        ;;
    start)
        start_app
        ;;
    stop)
        stop_app
        ;;
    restart)
        restart_app
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    clean)
        clean_all
        ;;
    deploy)
        deploy_production
        ;;
    help|*)
        show_help
        ;;
esac
