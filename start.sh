#!/bin/bash

echo "🚀 Application de Gestion de Location"
echo "====================================="
echo ""

# Vérifications préalables
echo "🔍 Vérifications..."

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi
echo "✅ Node.js disponible"

# Vérifier les dépendances
if [ ! -d "node_modules" ] || [ ! -d "node_modules/multer" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi
echo "✅ Dépendances installées"

# Vérifier le dossier de données
if [ ! -d "data" ]; then
    echo "📁 Création du dossier data..."
    mkdir -p data
fi

# Vérifier les fichiers de données
if [ ! -f "data/stock.json" ]; then
    echo "📝 Création de data/stock.json..."
    echo '[]' > data/stock.json
fi

if [ ! -f "data/locations.json" ]; then
    echo "📝 Création de data/locations.json..."
    echo '[]' > data/locations.json
fi
echo "✅ Fichiers de données présents"

# Vérifier le dossier uploads
if [ ! -d "public/uploads" ]; then
    echo "📁 Création du dossier uploads..."
    mkdir -p public/uploads
fi
echo "✅ Dossier uploads présent"

echo ""
echo "🎯 Tout est prêt !"
echo ""
echo "📋 Accès à l'application :"
echo "   • Formulaire public : http://localhost:3000/formulaire-location.html"
echo "   • Administration : http://localhost:3000/login.html"
echo "   • Identifiants : test/test"
echo ""
echo "▶️  Démarrage du serveur..."
echo "   (Ctrl+C pour arrêter)"
echo ""

# Démarrer le serveur
node index.js
