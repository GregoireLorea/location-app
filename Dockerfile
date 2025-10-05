# Utiliser l'image officielle Node.js 20
FROM node:20-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --production

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Créer les dossiers nécessaires et définir les permissions
RUN mkdir -p data public/uploads services
RUN chown -R nodejs:nodejs /app

# Copier le code source
COPY --chown=nodejs:nodejs . .

# Basculer vers l'utilisateur non-root
USER nodejs

# Exposer le port
EXPOSE 3000

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Commande de démarrage
CMD ["node", "index.js"]
