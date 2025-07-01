const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route pour servir index.html à la racine
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const STOCK_FILE = './stock.json';
const LOCATIONS_FILE = './locations.json';

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

app.get('/stock', (req, res) => {
  res.json(loadData(STOCK_FILE));
});

app.post('/stock', (req, res) => {
  const stock = loadData(STOCK_FILE);
  const { name, description, price, caution, qty, location, category } = req.body;
  stock.push({ 
    id: Date.now(), 
    name, 
    description: description || '', 
    price, 
    caution, 
    qty, 
    location: location || 'Non spécifié', 
    category: category || 'autre' 
  });
  saveData(STOCK_FILE, stock);
  res.json({ ok: true });
});

// Modifier un item du stock
app.put('/stock/:id', (req, res) => {
  const stock = loadData(STOCK_FILE);
  const itemId = parseInt(req.params.id);
  const { name, description, price, caution, qty, location, category } = req.body;
  
  const itemIndex = stock.findIndex(item => item.id === itemId);
  if (itemIndex === -1) {
    return res.status(404).json({ error: "Item non trouvé" });
  }
  
  stock[itemIndex] = { 
    id: itemId, 
    name, 
    description: description || '', 
    price, 
    caution, 
    qty, 
    location: location || 'Non spécifié', 
    category: category || 'autre' 
  };
  saveData(STOCK_FILE, stock);
  res.json({ ok: true });
});

// Supprimer un item du stock
app.delete('/stock/:id', (req, res) => {
  const stock = loadData(STOCK_FILE);
  const itemId = parseInt(req.params.id);
  
  const filteredStock = stock.filter(item => item.id !== itemId);
  if (filteredStock.length === stock.length) {
    return res.status(404).json({ error: "Item non trouvé" });
  }
  
  saveData(STOCK_FILE, filteredStock);
  res.json({ ok: true });
});

app.get('/locations', (req, res) => {
  res.json(loadData(LOCATIONS_FILE));
});

app.post('/locations', (req, res) => {
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
// Modifier une réservation
app.put('/locations/:id', (req, res) => {
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
app.put('/locations/:id/finish', (req, res) => {
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
app.delete('/locations/:id', (req, res) => {
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
app.put('/locations/:id/start', (req, res) => {
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