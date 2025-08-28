# Configuration O2Switch - Sous-domaine pour Location Manager

## Étapes pour configurer le sous-domaine chez O2Switch

### 1. Connexion à cPanel O2Switch
- Connectez-vous à votre espace client O2Switch
- Accédez au cPanel de votre domaine principal

### 2. Créer le sous-domaine
- Allez dans "Sous-domaines" dans cPanel
- Créez un nouveau sous-domaine (ex: `location.votre-domaine.com`)
- Laissez le dossier par défaut (il ne sera pas utilisé)

### 3. Configuration DNS/Redirection
Vous avez 2 options :

#### Option A: Redirection (Plus simple)
1. Dans cPanel, allez dans "Redirections"
2. Créez une redirection :
   - De: `location.votre-domaine.com`
   - Vers: `https://votre-app-google-cloud.ew.r.appspot.com`
   - Type: Redirection permanente (301)

#### Option B: DNS CNAME (Plus propre)
1. Dans cPanel, allez dans "Zone DNS"
2. Ajoutez un enregistrement CNAME :
   - Nom: `location`
   - Cible: `ghs.googlehosted.com`
3. Dans Google Cloud Console :
   - Allez dans App Engine > Paramètres > Domaines personnalisés
   - Ajoutez votre sous-domaine `location.votre-domaine.com`
   - Suivez les instructions de vérification

### 4. Certificat SSL (Si Option B)
- Google Cloud gérera automatiquement le certificat SSL
- Patientez 15-60 minutes pour la propagation

### 5. Test
- Testez `https://location.votre-domaine.com`
- Vérifiez que l'application se charge correctement

## Variables d'environnement importantes
Après déploiement, vérifiez dans Google Cloud Console que :
- EMAIL_USER est configuré
- EMAIL_PASS est configuré  
- ADMIN_EMAIL est configuré

## Commandes utiles post-déploiement
```bash
# Voir les logs en temps réel
gcloud app logs tail -s default

# Redéployer après modifications
./deploy.sh

# Ouvrir l'app dans le navigateur
gcloud app browse
```

## Coûts estimés Google Cloud
- Gratuit jusqu'à 28 heures d'instance par jour
- Coût minimal pour un site peu visité (~1-5€/mois)
- Évolutif selon le trafic

## Support
- Console Google Cloud: https://console.cloud.google.com
- Documentation O2Switch: https://faq.o2switch.fr
- Logs d'erreur: Consultez les logs Google Cloud en cas de problème
