# 🔧 Guide de Dépannage

## Problèmes courants

### Le serveur ne démarre pas

1. **Vérifier Node.js**
   ```bash
   node --version
   # Doit afficher v16+ ou plus récent
   ```

2. **Réinstaller les dépendances**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Vérifier le port**
   ```bash
   lsof -i :3000
   # Si occupé, tuer le processus ou changer le port
   ```

### Les images ne s'affichent pas

1. **Vérifier le dossier uploads**
   ```bash
   ls -la public/uploads/
   ```

2. **Permissions du dossier**
   ```bash
   chmod 755 public/uploads/
   ```

### Erreur d'authentification

1. **Vider le cache du navigateur**
2. **Essayer en navigation privée**
3. **Redémarrer le serveur**

### Les données ne se chargent pas

1. **Vérifier les fichiers JSON**
   ```bash
   cat data/stock.json
   cat data/locations.json
   ```

2. **Réinitialiser les données**
   ```bash
   echo '[]' > data/stock.json
   echo '[]' > data/locations.json
   ```

## Logs et debug

Ouvrir la console développeur (F12) pour voir les erreurs JavaScript.

Le serveur affiche les logs dans le terminal.

## Réinitialisation complète

```bash
# Sauvegarder les données si nécessaire
cp data/stock.json data/stock_backup.json
cp data/locations.json data/locations_backup.json

# Nettoyer complètement
rm -rf node_modules package-lock.json
rm -f data/stock.json data/locations.json
rm -rf public/uploads/*

# Réinstaller
npm install
./start.sh
```
