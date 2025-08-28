const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const emailService = require('./services/emailService');
require('dotenv').config();

// Configuration des chemins de données (local vs Cloud Storage)
const isCloudRun = process.env.NODE_ENV === 'production';
const dataPath = isCloudRun && fs.existsSync('/app/data') ? '/app/data' : path.join(__dirname, 'data');

console.log(`📁 Utilisation du stockage: ${dataPath}`);
console.log(`🌐 Environnement: ${isCloudRun ? 'Cloud Run' : 'Local'}`);

// Créer le dossier data s'il n'existe pas
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
  console.log(`📂 Dossier de données créé: ${dataPath}`);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration pour Cloud Run - Trust proxy
app.set('trust proxy', true);

// Configuration des sessions pour Cloud Run
app.use(session({
  secret: process.env.SESSION_SECRET || 'location-manager-secret-key-change-in-production',
  resave: true,
  saveUninitialized: true,
  name: 'sessionId', // Nom explicite du cookie
  cookie: { 
    secure: false, // Cloud Run termine SSL, l'app reçoit du HTTP
    httpOnly: true, // Sécurité contre XSS
    maxAge: 24 * 60 * 60 * 1000, // 24 heures
    sameSite: 'lax' // Permet les redirections cross-origin
  }
}));

// Middleware pour parser JSON
app.use(express.json());

// Utilisateurs (à déplacer vers une base de données en production)
const users = [
  {
    id: 1,
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10), // Hash du mot de passe
    role: 'admin'
  },
  {
    id: 2,
    username: 'user',
    password: bcrypt.hashSync('password', 10), // Identifiants alternatifs
    role: 'admin'
  },
];

// Middleware d'authentification
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
}

// Middleware pour servir les fichiers statiques avec authentification
function serveWithAuth(req, res, next) {
  const publicFiles = [
    '/login.html',
    '/formulaire-location.html',
    '/style.css',
    '/auth.js'
  ];
  
  // Permettre l'accès aux endpoints publics
  const publicPaths = [
    '/auth/',
    '/webhook/',
    '/public/',
    '/import/',
    '/uploads/'
  ];
  
  // Permettre l'accès aux fichiers publics
  if (publicFiles.some(file => req.path.endsWith(file))) {
    return next();
  }
  
  // Permettre l'accès aux chemins publics
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // Rediriger vers login si pas authentifié
  if (!req.session || !req.session.userId) {
    if (req.path === '/' || req.path.endsWith('.html')) {
      return res.redirect('/login.html');
    }
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  next();
}

// Servir les fichiers statiques (y compris uploads) AVANT l'authentification
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(serveWithAuth);
app.use(express.static(path.join(__dirname, 'public')));

// Configuration de multer pour l'upload des images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Générer un nom unique avec timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'item-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accepter seulement les images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});


// Route de connexion
app.post('/auth/login', async (req, res) => {
  try {
    console.log('Tentative de connexion:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('Erreur: champs manquants');
      return res.status(400).json({ 
        success: false, 
        message: 'Nom d\'utilisateur et mot de passe requis' 
      });
    }
    
    // Chercher l'utilisateur
    const user = users.find(u => u.username === username);
    console.log('Utilisateur trouvé:', user ? 'Oui' : 'Non');
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Identifiants incorrects' 
      });
    }
    
    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Mot de passe valide:', isValidPassword);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Identifiants incorrects' 
      });
    }
    
    // Créer la session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    
    console.log('Connexion réussie pour:', username);
    console.log('Session créée:', req.session);
    console.log('Session ID:', req.sessionID);
    
    // Sauvegarder explicitement la session
    req.session.save((err) => {
      if (err) {
        console.error('Erreur sauvegarde session:', err);
      } else {
        console.log('Session sauvegardée avec succès');
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Connexion réussie',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Erreur de connexion:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Route de déconnexion
app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la déconnexion' 
      });
    }
    res.json({ 
      success: true, 
      message: 'Déconnexion réussie' 
    });
  });
});

// Route pour vérifier le statut de connexion
app.get('/auth/status', (req, res) => {
  console.log('Vérification statut auth - Session:', req.session);
  console.log('Session ID:', req.sessionID);
  console.log('Headers:', req.headers);
  
  if (req.session && req.session.userId) {
    const user = users.find(u => u.id === req.session.userId);
    res.json({ 
      authenticated: true, 
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Route de debug pour Cloud Run
app.get('/debug', (req, res) => {
  res.json({
    session: req.session,
    sessionID: req.sessionID,
    cookies: req.headers.cookie,
    headers: req.headers,
    ip: req.ip,
    ips: req.ips,
    protocol: req.protocol,
    secure: req.secure,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Route pour servir index.html à la racine (avec authentification)
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configuration des fichiers de données avec stockage persistant
const STOCK_FILE = path.join(dataPath, 'stock.json');
const LOCATIONS_FILE = path.join(dataPath, 'locations.json');

function loadData(file) {
  if (!fs.existsSync(file)) {
    console.log(`📄 Création du fichier: ${file}`);
    return [];
  }
  console.log(`📖 Lecture du fichier: ${file}`);
  return JSON.parse(fs.readFileSync(file));
}

function saveData(file, data) {
  console.log(`💾 Sauvegarde dans: ${file}`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}




function isAvailable(itemId, from, to, qty) {
  const stock = loadData(STOCK_FILE).find(i => i.id === itemId);
  if (!stock) {
    console.log(`❌ Article ${itemId} non trouvé dans le stock`);
    return false;
  }
  
  // Prendre en compte toutes les réservations actives (planned, ongoing, pending)
  const allBookings = loadData(LOCATIONS_FILE).filter(loc => 
    loc.itemId === itemId && 
    ['planned', 'ongoing', 'pending'].includes(loc.status)
  );
  
  console.log(`🔍 Article ${itemId} (${stock.name}): ${allBookings.length} réservations actives`);
  
  const overlap = allBookings.filter(loc => {
    const hasOverlap = (
      (new Date(from) <= new Date(loc.to)) &&
      (new Date(to) >= new Date(loc.from))
    );
    if (hasOverlap) {
      console.log(`📅 Conflit trouvé: ${loc.from} -> ${loc.to} (qty: ${loc.qty || 1})`);
    }
    return hasOverlap;
  });
  
  const qtyBooked = overlap.reduce((sum, l) => sum + (l.qty || 1), 0);
  const available = (stock.qty - qtyBooked);
  const isAvailableResult = available >= qty;
  
  console.log(`📊 Stock total: ${stock.qty}, Réservé: ${qtyBooked}, Disponible: ${available}, Demandé: ${qty}, Résultat: ${isAvailableResult}`);
  
  return isAvailableResult;
}

app.get('/stock', requireAuth, (req, res) => {
  const stock = loadData(STOCK_FILE);
  const locations = loadData(LOCATIONS_FILE);
  
  // Enrichir chaque article avec les informations de réservation
  const enrichedStock = stock.map(item => {
    // Calculer les réservations actives pour cet article
    const activeBookings = locations.filter(loc => 
      loc.itemId === item.id && 
      ['planned', 'ongoing', 'pending'].includes(loc.status)
    );
    
    // Calculer la quantité totale réservée
    const totalBooked = activeBookings.reduce((sum, loc) => sum + (loc.qty || 1), 0);
    
    // Calculer la disponibilité
    const available = Math.max(0, item.qty - totalBooked);
    
    return {
      ...item,
      totalBooked,
      available,
      bookings: activeBookings.map(booking => ({
        id: booking.id,
        clientName: booking.clientName || booking.customerName || 'Client inconnu',
        from: booking.from,
        to: booking.to,
        qty: booking.qty || 1,
        status: booking.status
      }))
    };
  });
  
  res.json(enrichedStock);
});

// Endpoint simple pour le stock (sans calculs de réservation)
app.get('/stock/simple', requireAuth, (req, res) => {
  res.json(loadData(STOCK_FILE));
});

// Endpoint public pour le formulaire de demande (sans authentification)
app.get('/public/stock', (req, res) => {
  const stock = loadData(STOCK_FILE);
  const locations = loadData(LOCATIONS_FILE);
  
  // Retourner les infos nécessaires pour le formulaire public avec disponibilité
  const publicStock = stock.map(item => {
    // Calculer les réservations actives pour cet article
    const activeBookings = locations.filter(loc => 
      loc.itemId === item.id && 
      ['planned', 'ongoing', 'pending'].includes(loc.status)
    );
    
    // Calculer la quantité totale réservée
    const totalBooked = activeBookings.reduce((sum, loc) => sum + (loc.qty || 1), 0);
    
    // Calculer la disponibilité
    const available = Math.max(0, item.qty - totalBooked);
    
    return {
      id: item.id,
      name: item.name,
      price: item.price,
      qty: item.qty,
      available: available,
      totalBooked: totalBooked,
      description: item.description,
      photo: item.photo,
      caution: item.caution
    };
  });
  
  res.json(publicStock);
});

// Endpoint public pour vérifier la disponibilité (sans authentification)
app.post('/public/check-availability', (req, res) => {
  try {
    const { items, from, to } = req.body;
    
    if (!items || !Array.isArray(items) || !from || !to) {
      return res.status(400).json({ 
        error: 'Paramètres manquants (items, from, to)' 
      });
    }

    const stock = loadData(STOCK_FILE);
    const locations = loadData(LOCATIONS_FILE);
    const results = [];

    for (const requestedItem of items) {
      const { itemId, quantity } = requestedItem;
      const stockItem = stock.find(s => s.id === itemId);
      
      if (!stockItem) {
        results.push({
          itemId,
          quantity,
          available: 0,
          isAvailable: false,
          error: 'Matériel non trouvé'
        });
        continue;
      }

      // Trouver les conflits pour ce matériel (toutes les réservations actives)
      const conflicts = locations.filter(location => {
        if (location.itemId !== itemId || !['planned', 'ongoing', 'pending'].includes(location.status)) {
          return false;
        }

        const locFrom = new Date(location.from);
        const locTo = new Date(location.to);
        const reqFrom = new Date(from);
        const reqTo = new Date(to);

        // Vérifier le chevauchement
        return (reqFrom <= locTo && reqTo >= locFrom);
      });

      const bookedQuantity = conflicts.reduce((sum, loc) => sum + (loc.qty || 1), 0);
      const availableQuantity = stockItem.qty - bookedQuantity;
      const isAvailable = availableQuantity >= quantity;

      results.push({
        itemId,
        itemName: stockItem.name,
        quantity,
        available: availableQuantity,
        total: stockItem.qty,
        booked: bookedQuantity,
        isAvailable
      });
    }

    res.json({
      success: true,
      from,
      to,
      results,
      allAvailable: results.every(r => r.isAvailable)
    });

  } catch (error) {
    console.error('Erreur vérification disponibilité:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la vérification de disponibilité' 
    });
  }
});

app.post('/stock', requireAuth, upload.single('photo'), (req, res) => {
  try {
    const stock = loadData(STOCK_FILE);
    const { name, description, price, caution, qty, location, category } = req.body;
    
    // Gérer l'image uploadée
    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    }
    
    const newItem = { 
      id: Date.now(), 
      name, 
      description: description || '', 
      price: parseFloat(price) || 0, 
      caution: parseFloat(caution) || 0, 
      qty: parseInt(qty) || 1, 
      location: location || 'Non spécifié', 
      category: category || 'autre',
      photo: photoUrl
    };
    
    stock.push(newItem);
    saveData(STOCK_FILE, stock);
    res.json({ ok: true, item: newItem });
  } catch (error) {
    console.error('Erreur ajout stock:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout' });
  }
});

// Modifier un item du stock
app.put('/stock/:id', requireAuth, upload.single('photo'), (req, res) => {
  try {
    const stock = loadData(STOCK_FILE);
    const itemId = parseInt(req.params.id);
    const { name, description, price, caution, qty, location, category } = req.body;
    
    const itemIndex = stock.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item non trouvé" });
    }
    
    // Conserver l'ancienne photo si pas de nouvelle photo
    let photoUrl = stock[itemIndex].photo;
    if (req.file) {
      // Supprimer l'ancienne photo si elle existe
      if (photoUrl) {
        const oldPhotoPath = path.join(__dirname, 'public', photoUrl);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      photoUrl = `/uploads/${req.file.filename}`;
    }
    
    stock[itemIndex] = { 
      id: itemId, 
      name, 
      description: description || '', 
      price: parseFloat(price) || 0, 
      caution: parseFloat(caution) || 0, 
      qty: parseInt(qty) || 1, 
      location: location || 'Non spécifié', 
      category: category || 'autre',
      photo: photoUrl
    };
    
    saveData(STOCK_FILE, stock);
    res.json({ ok: true, item: stock[itemIndex] });
  } catch (error) {
    console.error('Erreur modification stock:', error);
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
});

// Supprimer un item du stock
app.delete('/stock/:id', requireAuth, (req, res) => {
  try {
    const stock = loadData(STOCK_FILE);
    const itemId = parseInt(req.params.id);
    
    // Trouver l'item à supprimer
    const itemToDelete = stock.find(item => item.id === itemId);
    if (!itemToDelete) {
      return res.status(404).json({ error: "Item non trouvé" });
    }
    
    // Supprimer la photo si elle existe
    if (itemToDelete.photo) {
      const photoPath = path.join(__dirname, 'public', itemToDelete.photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
        console.log(`Photo supprimée: ${photoPath}`);
      }
    }
    
    // Supprimer l'item du stock
    const filteredStock = stock.filter(item => item.id !== itemId);
    saveData(STOCK_FILE, filteredStock);
    
    res.json({ ok: true, message: 'Article et photo supprimés avec succès' });
  } catch (error) {
    console.error('Erreur suppression stock:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

app.get('/locations', requireAuth, (req, res) => {
  res.json(loadData(LOCATIONS_FILE));
});

app.post('/locations', requireAuth, async (req, res) => {
  const locations = loadData(LOCATIONS_FILE);
  const { 
    itemId, 
    from, 
    fromTime,
    to, 
    toTime,
    qty, 
    clientName,
    clientLastName,
    clientFirstName,
    associationName,
    contactPhone,
    contactEmail,
    preferredContact,
    messengerHandle,
    requestComment
  } = req.body;

  if (!isAvailable(itemId, from, to, qty)) {
    return res.status(400).json({ error: "Objet non disponible à ces dates" });
  }

  const newLocation = { 
    id: Date.now(), 
    itemId, 
    from, 
    fromTime: fromTime || '',
    to, 
    toTime: toTime || '',
    qty, 
    clientName,
    clientLastName: clientLastName || '',
    clientFirstName: clientFirstName || '',
    associationName: associationName || '',
    contactPhone: contactPhone || '',
    contactEmail: contactEmail || '',
    preferredContact: preferredContact || '',
    messengerHandle: messengerHandle || '',
    requestComment: requestComment || '',
    status: 'planned'
  };
  
  locations.push(newLocation);
  saveData(LOCATIONS_FILE, locations);
  
  // 🎯 ENVOYER LES EMAILS DE CONFIRMATION (SI EMAIL CLIENT FOURNI)
  if (contactEmail && contactEmail.trim()) {
    try {
      const stock = loadData(STOCK_FILE);
      const item = stock.find(s => s.id === itemId);
      
      if (item) {
        const client = {
          clientName: clientName || `${clientFirstName} ${clientLastName}`.trim(),
          contactEmail: contactEmail,
          contactPhone: contactPhone || '',
          associationName: associationName || '',
          from,
          to,
          requestComment: requestComment || '',
          source: 'admin-creation'
        };
        
        const items = [{
          location: newLocation,
          item: item
        }];
        
        // Envoyer les emails en parallèle
        await Promise.all([
          emailService.sendAdminNotification(client, items),
          emailService.sendClientConfirmation(client, items)
        ]);
        console.log('📧 Emails (admin + client) envoyés pour création manuelle');
      }
    } catch (emailError) {
      console.error('❌ Erreur envoi emails création manuelle:', emailError);
      // Ne pas faire échouer la création si l'email échoue
    }
  }
  
  res.json({ ok: true });
});

// Modifier une réservation
app.put('/locations/:id', requireAuth, (req, res) => {
  const locations = loadData(LOCATIONS_FILE);
  const locationId = parseInt(req.params.id);
  const { 
    itemId, 
    from, 
    fromTime,
    to, 
    toTime,
    qty, 
    clientName,
    clientLastName,
    clientFirstName,
    associationName,
    contactPhone,
    contactEmail,
    preferredContact,
    messengerHandle,
    requestComment
  } = req.body;
  
  const locationIndex = locations.findIndex(loc => loc.id === locationId);
  if (locationIndex === -1) {
    return res.status(404).json({ error: "Réservation non trouvée" });
  }
  
  // Vérifier la disponibilité en excluant la réservation actuelle et en prenant en compte toutes les réservations actives
  const otherLocations = locations.filter(loc => 
    loc.id !== locationId && 
    ['planned', 'ongoing', 'pending'].includes(loc.status)
  );
  const stock = loadData(STOCK_FILE).find(i => i.id === itemId);
  const overlap = otherLocations.filter(loc => loc.itemId === itemId && (
    (new Date(from) <= new Date(loc.to)) &&
    (new Date(to) >= new Date(loc.from))
  ));
  const qtyBooked = overlap.reduce((sum, l) => sum + (l.qty || 1), 0);
  
  if ((stock.qty - qtyBooked) < qty) {
    return res.status(400).json({ error: "Objet non disponible à ces dates" });
  }
  
  locations[locationIndex] = { 
    id: locationId, 
    itemId, 
    from, 
    fromTime: fromTime || locations[locationIndex].fromTime || '',
    to, 
    toTime: toTime || locations[locationIndex].toTime || '',
    qty, 
    clientName,
    clientLastName: clientLastName || locations[locationIndex].clientLastName || '',
    clientFirstName: clientFirstName || locations[locationIndex].clientFirstName || '',
    associationName: associationName || locations[locationIndex].associationName || '',
    contactPhone: contactPhone || locations[locationIndex].contactPhone || '',
    contactEmail: contactEmail || locations[locationIndex].contactEmail || '',
    preferredContact: preferredContact || locations[locationIndex].preferredContact || '',
    messengerHandle: messengerHandle || locations[locationIndex].messengerHandle || '',
    requestComment: requestComment || locations[locationIndex].requestComment || '',
    status: req.body.status || locations[locationIndex].status || 'planned'
  };
  saveData(LOCATIONS_FILE, locations);
  res.json({ ok: true });
});

// Marquer une réservation comme terminée
app.put('/locations/:id/finish', requireAuth, (req, res) => {
  const locations = loadData(LOCATIONS_FILE);
  const locationId = parseInt(req.params.id);
  
  const locationIndex = locations.findIndex(loc => loc.id === locationId);
  if (locationIndex === -1) {
    return res.status(404).json({ error: "Réservation non trouvée" });
  }
  
  locations[locationIndex].status = 'finished';
  saveData(LOCATIONS_FILE, locations);
  res.json({ ok: true });
});

// Supprimer une réservation
app.delete('/locations/:id', requireAuth, (req, res) => {
  const locations = loadData(LOCATIONS_FILE);
  const locationId = parseInt(req.params.id);
  
  const filteredLocations = locations.filter(loc => loc.id !== locationId);
  if (filteredLocations.length === locations.length) {
    return res.status(404).json({ error: "Réservation non trouvée" });
  }
  
  saveData(LOCATIONS_FILE, filteredLocations);
  res.json({ ok: true });
});

// Démarrer une réservation (passer de 'planned' à 'ongoing')
app.put('/locations/:id/start', requireAuth, (req, res) => {
  const locations = loadData(LOCATIONS_FILE);
  const locationId = parseInt(req.params.id);
  
  const locationIndex = locations.findIndex(loc => loc.id === locationId);
  if (locationIndex === -1) {
    return res.status(404).json({ error: "Réservation non trouvée" });
  }
  
  if (locations[locationIndex].status !== 'planned') {
    return res.status(400).json({ error: "Cette réservation ne peut pas être démarrée" });
  }
  
  locations[locationIndex].status = 'ongoing';
  saveData(LOCATIONS_FILE, locations);
  res.json({ ok: true });
});

// Stockage temporaire pour grouper les demandes
const pendingNotifications = new Map();

// Endpoint pour traiter les emails entrants depuis Zapier
app.post('/webhook/email', express.json(), async (req, res) => {
  try {
    console.log('Email webhook reçu depuis Zapier:', req.body);
    
    // Les données viennent de Zapier qui a parsé l'email WPForms
    const emailData = req.body;
    
    // Mapper les données email vers notre structure
    const locationRequest = {
      clientLastName: emailData.nom || emailData.lastname || '',
      clientFirstName: emailData.prenom || emailData.firstname || '',
      clientName: `${emailData.prenom || emailData.firstname || ''} ${emailData.nom || emailData.lastname || ''}`.trim(),
      associationName: emailData.association || '',
      contactPhone: emailData.telephone || emailData.phone || '',
      contactEmail: emailData.email || '',
      preferredContact: emailData.contact_pref || 'email',
      messengerHandle: emailData.messenger || '',
      from: emailData.date_debut || emailData.du || '',
      fromTime: emailData.heure_debut || '',
      to: emailData.date_fin || emailData.au || '',
      toTime: emailData.heure_fin || '',
      requestComment: emailData.commentaire || emailData.message || '',
      itemId: parseInt(emailData.materiel_id || 1),
      qty: parseInt(emailData.quantite || emailData.qty || 1),
      status: 'planned',
      source: 'email-zapier'
    };

    // Sauvegarder la demande de location
    const locations = loadData(LOCATIONS_FILE);
    const newLocation = {
      id: Date.now(),
      ...locationRequest
    };
    
    locations.push(newLocation);
    saveData(LOCATIONS_FILE, locations);
    
    console.log('Nouvelle demande de location créée depuis email:', newLocation);
    
    // 🎯 GROUPER LES NOTIFICATIONS PAR EMAIL
    const clientKey = `${emailData.email || 'unknown'}_${emailData.date_debut || 'nodate'}`;
    
    if (!pendingNotifications.has(clientKey)) {
      pendingNotifications.set(clientKey, {
        client: locationRequest,
        items: [],
        timer: null
      });
    }
    
    // Ajouter l'article à la liste
    const stock = loadData(STOCK_FILE);
    const item = stock.find(s => s.id === newLocation.itemId) || {
      name: emailData.materiel_nom || 'Article non identifié',
      price: 0,
      caution: 0
    };
    
    pendingNotifications.get(clientKey).items.push({
      location: newLocation,
      item: item
    });
    
    // Annuler le timer précédent et en créer un nouveau (attendre 5 secondes pour d'autres articles)
    if (pendingNotifications.get(clientKey).timer) {
      clearTimeout(pendingNotifications.get(clientKey).timer);
    }
    
    pendingNotifications.get(clientKey).timer = setTimeout(async () => {
      const notificationData = pendingNotifications.get(clientKey);
      pendingNotifications.delete(clientKey);
      
      try {
        // Envoyer les emails en parallèle
        await Promise.all([
          emailService.sendAdminNotification(notificationData.client, notificationData.items),
          emailService.sendClientConfirmation(notificationData.client, notificationData.items)
        ]);
        console.log(`📧 Emails (admin + client) envoyés pour ${notificationData.items.length} article(s)`);
      } catch (emailError) {
        console.error('❌ Erreur envoi emails depuis webhook:', emailError);
      }
    }, 5000); // Attendre 5 secondes
    
    res.status(200).json({ 
      success: true, 
      message: 'Demande de location reçue depuis email et enregistrée',
      locationId: newLocation.id 
    });
    
  } catch (error) {
    console.error('Erreur webhook email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors du traitement de l\'email: ' + error.message 
    });
  }
});

// Endpoint public pour créer une demande de location
app.post('/public/locations', async (req, res) => {
  try {
    const {
      itemId,
      qty,
      from,
      to,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      comments
    } = req.body;

    // Validation des données
    if (!itemId || !qty || !from || !to || !customerName || !customerEmail) {
      return res.status(400).json({
        error: 'Tous les champs obligatoires doivent être renseignés'
      });
    }

    // Vérifier la disponibilité
    if (!isAvailable(itemId, from, to, qty)) {
      return res.status(400).json({
        error: 'Cet article n\'est pas disponible pour ces dates'
      });
    }

    // Récupérer les infos de l'article
    const stock = loadData(STOCK_FILE);
    const item = stock.find(s => s.id === itemId);
    if (!item) {
      return res.status(404).json({ error: 'Article non trouvé' });
    }

    // Calculer les totaux
    const totalPrice = item.price * qty;
    const totalCaution = item.caution * qty;

    // Créer la location
    const locations = loadData(LOCATIONS_FILE);
    const newLocation = {
      id: Date.now(),
      itemId: parseInt(itemId),
      qty: parseInt(qty),
      from,
      to,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      comments,
      totalPrice,
      totalCaution,
      status: 'planned',
      createdAt: new Date().toISOString()
    };

    locations.push(newLocation);
    saveData(LOCATIONS_FILE, locations);

    // 🎯 ENVOYER LES EMAILS DE NOTIFICATION (ADMIN + CLIENT)
    const client = {
      clientName: customerName,
      contactEmail: customerEmail,
      contactPhone: customerPhone,
      from,
      to,
      requestComment: comments,
      source: 'formulaire-public'
    };
    
    const items = [{
      location: newLocation,
      item: item
    }];
    
    // Envoyer les emails en parallèle
    try {
      await Promise.all([
        emailService.sendAdminNotification(client, items),
        emailService.sendClientConfirmation(client, items)
      ]);
      console.log('📧 Emails (admin + client) envoyés avec succès');
    } catch (emailError) {
      console.error('❌ Erreur envoi emails:', emailError);
      // Ne pas faire échouer la création de location si l'email échoue
    }

    res.json({
      success: true,
      message: 'Demande de location créée avec succès',
      location: newLocation
    });

  } catch (error) {
    console.error('Erreur création location:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Endpoint pour le calendrier (authentifié, avec données enrichies)
app.get('/calendar/data', requireAuth, (req, res) => {
  try {
    const stock = loadData(STOCK_FILE);
    const locations = loadData(LOCATIONS_FILE);
    
    // Enrichir les données de location avec les informations des articles
    const enrichedLocations = locations.map(location => {
      const item = stock.find(s => s.id === location.itemId);
      return {
        ...location,
        itemName: item ? item.name : `Article ${location.itemId}`,
        itemPrice: item ? item.price : 0,
        itemCaution: item ? item.caution : 0
      };
    });
    
    res.json({
      stock: stock,
      locations: enrichedLocations
    });
  } catch (error) {
    console.error('Erreur chargement données calendrier:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
  console.log(`Accessible depuis le réseau local sur http://192.168.1.46:${PORT}`);
  
  // Initialiser le service email avec les variables d'environnement
  emailService.initializeEmailService({
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS
  });
  
  // Tester la config email au démarrage
  emailService.testEmailConfig();
});