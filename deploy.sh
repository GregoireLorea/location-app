#!/bin/bash

echo "🚀 Déploiement Location Manager sur Google Cloud"
echo "================================================"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
PROJECT_ID="location-manager-${USER}-$(date +%s)"
REGION="europe-west1"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "   Project ID: $PROJECT_ID"
echo "   Region: $REGION"
echo ""

# Vérifier Google Cloud CLI
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI non installé${NC}"
    echo -e "${YELLOW}📥 Installez-le: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# Authentification
echo -e "${BLUE}🔐 Vérification de l'authentification...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "."; then
    echo -e "${YELLOW}🔑 Authentification requise...${NC}"
    gcloud auth login
fi

# Créer le projet
echo -e "${BLUE}🆕 Création du projet $PROJECT_ID...${NC}"
gcloud projects create $PROJECT_ID --name="Location Manager" 2>/dev/null || echo "Projet existe déjà"

# Configurer le projet
gcloud config set project $PROJECT_ID

# Vérifier la facturation
echo -e "${YELLOW}💳 IMPORTANT: Activez la facturation pour ce projet:${NC}"
echo "   https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
echo ""
read -p "Appuyez sur Entrée quand la facturation est activée..."

# Activer les APIs
echo -e "${BLUE}🔧 Activation des APIs...${NC}"
gcloud services enable appengine.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Créer l'app App Engine
echo -e "${BLUE}🌍 Configuration App Engine...${NC}"
if ! gcloud app describe &> /dev/null; then
    gcloud app create --region=$REGION
fi

# Déployer
echo -e "${BLUE}🚀 Déploiement en cours...${NC}"
gcloud app deploy app.yaml --quiet

# Récupérer l'URL
APP_URL=$(gcloud app browse --no-launch-browser 2>&1 | grep -o 'https://[^[:space:]]*')

echo ""
echo -e "${GREEN}✅ Déploiement terminé !${NC}"
echo -e "${GREEN}🌐 URL de l'application: $APP_URL${NC}"
echo ""
echo -e "${BLUE}📊 Commandes utiles:${NC}"
echo "   Voir les logs: gcloud app logs tail -s default"
echo "   Ouvrir l'app: gcloud app browse"
echo "   Console: https://console.cloud.google.com/appengine?project=$PROJECT_ID"
echo ""
echo -e "${YELLOW}🔗 Pour O2Switch, utilisez cette URL: $APP_URL${NC}"

# Sauvegarder les infos
cat > deployment-info.txt << EOF
Déploiement Location Manager
==========================
Date: $(date)
Project ID: $PROJECT_ID
URL: $APP_URL
Region: $REGION

Pour redéployer: ./deploy.sh
Pour les logs: gcloud app logs tail -s default
EOF

echo -e "${GREEN}📄 Informations sauvées dans: deployment-info.txt${NC}"
