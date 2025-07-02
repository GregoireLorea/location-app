const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Configuration des sessions
app.use(session({
  secret: 'location-manager-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // true en HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
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

// Route pour servir index.html à la racine (avec authentification)
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const STOCK_FILE = './data/stock.json';
const LOCATIONS_FILE = './data/locations.json';

function loadData(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}

function saveData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}




function isAvailable(itemId, from, to, qty) {
  const stock = loadData(STOCK_FILE).find(i => i.id === itemId);
  // Ne prendre en compte que les locations en cours (ongoing)
  const allBookings = loadData(LOCATIONS_FILE).filter(loc => loc.itemId === itemId && loc.status === 'ongoing');
  const overlap = allBookings.filter(loc => {
    return (
      (new Date(from) <= new Date(loc.to)) &&
      (new Date(to) >= new Date(loc.from))
    );
  });
  const qtyBooked = overlap.reduce((sum, l) => sum + (l.qty || 1), 0);
  return (stock.qty - qtyBooked) >= qty;
}

app.get('/stock', requireAuth, (req, res) => {
  res.json(loadData(STOCK_FILE));
});

// Endpoint public pour le formulaire de demande (sans authentification)
app.get('/public/stock', (req, res) => {
  const stock = loadData(STOCK_FILE);
  // Retourner seulement les infos nécessaires pour le formulaire public
  const publicStock = stock.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    qty: item.qty,
    description: item.description,
    photo: item.photo,
    caution: item.caution
  }));
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

      // Trouver les conflits pour ce matériel (seulement les locations ongoing)
      const conflicts = locations.filter(location => {
        if (location.itemId !== itemId || location.status !== 'ongoing') {
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

app.post('/locations', requireAuth, (req, res) => {
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

  locations.push({ 
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
  });
  saveData(LOCATIONS_FILE, locations);
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
  
  // Vérifier la disponibilité en excluant la réservation actuelle et ne prenant en compte que les locations ongoing
  const otherLocations = locations.filter(loc => loc.id !== locationId && loc.status === 'ongoing');
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

// Endpoint webhook pour recevoir les demandes de location depuis WPForms
app.post('/webhook/wpforms', express.raw({type: 'application/json'}), (req, res) => {
  try {
    console.log('Webhook WPForms reçu:', req.body);
    
    // Parser les données du webhook
    const formData = JSON.parse(req.body);
    
    // Mapper les champs WPForms vers notre structure
    const locationRequest = {
      clientLastName: formData.lastname || formData.nom || '',
      clientFirstName: formData.firstname || formData.prenom || '',
      clientName: `${formData.firstname || formData.prenom || ''} ${formData.lastname || formData.nom || ''}`.trim(),
      associationName: formData.association || formData.organisation || '',
      contactPhone: formData.phone || formData.telephone || '',
      contactEmail: formData.email || formData.mail || '',
      preferredContact: formData.contact_pref || 'email',
      messengerHandle: formData.messenger || '',
      from: formData.date_debut || formData.from_date || '',
      fromTime: formData.heure_debut || formData.from_time || '',
      to: formData.date_fin || formData.to_date || '',
      toTime: formData.heure_fin || formData.to_time || '',
      requestComment: formData.commentaire || formData.message || formData.comment || '',
      itemId: parseInt(formData.materiel_id || formData.item_id || 1), // ID par défaut
      qty: parseInt(formData.quantite || formData.qty || 1),
      status: 'planned', // Nouveau statut par défaut
      source: 'wpforms' // Marquer la source
    };

    // Sauvegarder la demande de location
    const locations = loadData(LOCATIONS_FILE);
    const newLocation = {
      id: Date.now(),
      ...locationRequest
    };
    
    locations.push(newLocation);
    saveData(LOCATIONS_FILE, locations);
    
    console.log('Nouvelle demande de location créée automatiquement:', newLocation);
    
    res.status(200).json({ 
      success: true, 
      message: 'Demande de location reçue et enregistrée',
      locationId: newLocation.id 
    });
    
  } catch (error) {
    console.error('Erreur webhook WPForms:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors du traitement de la demande' 
    });
  }
});

// Endpoint pour importer des demandes depuis un CSV (WPForms export)
app.post('/import/csv', express.json({ limit: '50mb' }), (req, res) => {
  try {
    const { csvData } = req.body;
    console.log('Import CSV reçu');
    
    // Parser le CSV (format WPForms)
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const locations = loadData(LOCATIONS_FILE);
    let imported = 0;
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      // Mapper les colonnes WPForms vers notre structure
      const locationRequest = {
        clientLastName: row['Nom'] || row['Last Name'] || '',
        clientFirstName: row['Prénom'] || row['First Name'] || '',
        clientName: `${row['Prénom'] || row['First Name'] || ''} ${row['Nom'] || row['Last Name'] || ''}`.trim(),
        associationName: row['Association'] || row['Organisation'] || '',
        contactPhone: row['Téléphone'] || row['Phone'] || '',
        contactEmail: row['Email'] || row['E-mail'] || '',
        preferredContact: row['Contact préféré'] || 'email',
        messengerHandle: row['Messenger'] || '',
        from: formatDate(row['Date début'] || row['Date de début'] || ''),
        fromTime: row['Heure début'] || '',
        to: formatDate(row['Date fin'] || row['Date de fin'] || ''),
        toTime: row['Heure fin'] || '',
        requestComment: row['Commentaire'] || row['Message'] || '',
        itemId: findItemId(row['Matériel'] || row['Article'] || ''),
        qty: parseInt(row['Quantité'] || row['Qty'] || '1'),
        status: 'planned',
        source: 'csv_import'
      };

      const newLocation = {
        id: Date.now() + i, // Éviter les doublons d'ID
        ...locationRequest
      };
      
      locations.push(newLocation);
      imported++;
    }
    
    saveData(LOCATIONS_FILE, locations);
    
    res.status(200).json({ 
      success: true, 
      message: `${imported} demandes importées avec succès`,
      imported 
    });
    
  } catch (error) {
    console.error('Erreur import CSV:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de l\'import CSV' 
    });
  }
});

// Helper function pour formater les dates
function formatDate(dateStr) {
  if (!dateStr) return '';
  
  // Essayer différents formats de date
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
    /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[1]) { // YYYY-MM-DD
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      } else { // DD/MM/YYYY ou DD-MM-YYYY
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      }
    }
  }
  
  return dateStr;
}

// Helper function pour trouver l'ID du matériel par nom
function findItemId(itemName) {
  if (!itemName) return 1;
  
  const stock = loadData(STOCK_FILE);
  const item = stock.find(s => 
    s.name.toLowerCase().includes(itemName.toLowerCase()) ||
    itemName.toLowerCase().includes(s.name.toLowerCase())
  );
  
  return item ? item.id : 1; // ID par défaut si non trouvé
}

// Endpoint pour synchroniser avec l'API WPForms (nécessite WPForms Pro)
app.post('/sync/wpforms', express.json(), (req, res) => {
  try {
    const { wpformsApiKey, siteUrl, formId } = req.body;
    
    if (!wpformsApiKey || !siteUrl || !formId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Paramètres manquants (apiKey, siteUrl, formId)' 
      });
    }
    
    // Note: Cette fonction nécessiterait une implémentation complète avec axios
    // pour récupérer les données depuis l'API WPForms
    
    res.status(200).json({ 
      success: true, 
      message: 'Synchronisation WPForms configurée (fonction à implémenter)' 
    });
    
  } catch (error) {
    console.error('Erreur sync WPForms:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la synchronisation' 
    });
  }
});

// Endpoint pour traiter les emails entrants depuis Zapier
app.post('/webhook/email', express.json(), (req, res) => {
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
      fromTime: '',
      to: emailData.date_fin || emailData.au || '',
      toTime: '',
      requestComment: emailData.commentaire || emailData.message || '',
      itemId: parseInt(emailData.materiel_id || 1), // ID par défaut, à mapper selon vos articles
      qty: parseInt(emailData.quantite || emailData.qty || 1),
      status: 'planned', // Statut par défaut pour validation
      source: 'email-zapier' // Marquer la source
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
  console.log(`Accessible depuis le réseau local sur http://192.168.1.46:${PORT}`);
});