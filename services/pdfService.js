const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration des chemins
const isCloudRun = process.env.NODE_ENV === 'production';
const documentsPath = isCloudRun && fs.existsSync('/app/documents') ? '/app/documents' : path.join(__dirname, '..', 'documents');

// Créer le dossier documents s'il n'existe pas
if (!fs.existsSync(documentsPath)) {
  fs.mkdirSync(documentsPath, { recursive: true });
  console.log(`📂 Dossier documents créé: ${documentsPath}`);
}

function formatDateTime(date, time) {
  const dateObj = new Date(date);
  if (time) {
    return `${dateObj.toLocaleDateString('fr-FR')} à ${time}`;
  }
  return dateObj.toLocaleDateString('fr-FR');
}

function calculateDays(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diffTime = Math.abs(to - from);
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 pour inclure le jour de début
  return Math.max(1, diffDays); // Minimum 1 jour
}

function calculateTotalPrice(item, location) {
  const days = calculateDays(location.from, location.to);
  const pricePerDay = item.price || 0;
  return pricePerDay * location.qty * days;
}

function generateContractHTML(client, items) {
  let totalPrice = 0;
  let totalCaution = 0;

  const itemsHTML = items.map(({ location, item }) => {
    const itemPrice = calculateTotalPrice(item, location);
    const itemCaution = item.caution ? item.caution * location.qty : 0;
    const days = calculateDays(location.from, location.to);
    totalPrice += itemPrice;
    totalCaution += itemCaution;

    return `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${location.qty}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${days} jour${days > 1 ? 's' : ''}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.price}€/jour</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemPrice}€</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemCaution}€</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Contrat de Location - ${client.clientName}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          line-height: 1.4;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #4CAF50;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #4CAF50;
          margin-bottom: 10px;
        }
        .contract-title {
          font-size: 20px;
          font-weight: bold;
          margin: 20px 0;
        }
        .section {
          margin: 20px 0;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #4CAF50;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f4f4f4;
          font-weight: bold;
        }
        .total-row {
          background-color: #e8f5e8;
          font-weight: bold;
        }
        .signature-section {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
        }
        .signature-box {
          width: 45%;
          border: 1px solid #ddd;
          padding: 20px;
          text-align: center;
          min-height: 80px;
        }
        .conditions {
          font-size: 12px;
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">CarpeStudentem ASBL</div>
        <div>Rue de l'hocaille 12, 1348 Louvain-la-Neuve</div>
        <div>Email: carpestudentem@gmail.com</div>
      </div>

      <div class="contract-title">CONTRAT DE LOCATION DE MATÉRIEL</div>

      <div class="section">
        <div class="section-title">INFORMATIONS DU LOCATAIRE</div>
        <p><strong>Nom complet :</strong> ${client.clientName}</p>
        <p><strong>Email :</strong> ${client.contactEmail}</p>
        ${client.contactPhone ? `<p><strong>Téléphone :</strong> ${client.contactPhone}</p>` : ''}
        ${client.associationName ? `<p><strong>Association :</strong> ${client.associationName}</p>` : ''}
        <p><strong>Contrat n° :</strong> ${client.id}</p>
        <p><strong>Date du contrat :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
      </div>

      <div class="section">
        <div class="section-title">PÉRIODE DE LOCATION</div>
        <p><strong>Début :</strong> ${formatDateTime(items[0].location.from, items[0].location.fromTime)}</p>
        <p><strong>Fin :</strong> ${formatDateTime(items[0].location.to, items[0].location.toTime)}</p>
        <p><strong>Durée :</strong> ${calculateDays(items[0].location.from, items[0].location.to)} jour(s)</p>
      </div>

      <div class="section">
        <div class="section-title">MATÉRIEL LOUÉ</div>
        <table>
          <thead>
            <tr>
              <th>Article</th>
              <th>Quantité</th>
              <th>Durée</th>
              <th>Prix unitaire</th>
              <th>Prix total</th>
              <th>Caution</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="4"><strong>TOTAL</strong></td>
              <td style="text-align: right;"><strong>${totalPrice}€</strong></td>
              <td style="text-align: right;"><strong>${totalCaution}€</strong></td>
            </tr>
          </tfoot>
        </table>

        <p><strong>Montant total à payer :</strong> ${totalPrice + totalCaution}€ (Location: ${totalPrice}€ + Caution: ${totalCaution}€)</p>
      </div>

      ${client.requestComment ? `
        <div class="section">
          <div class="section-title">COMMENTAIRES</div>
          <p>${client.requestComment}</p>
        </div>
      ` : ''}

      <div class="section">
        <div class="section-title">CONDITIONS GÉNÉRALES</div>
        <div class="conditions">
          <p><strong>1. CAUTION :</strong> Une caution de ${totalCaution}€ est exigée et sera restituée à la fin de la location si le matériel est rendu en bon état.</p>
          <p><strong>2. RESPONSABILITÉ :</strong> Le locataire est responsable du matériel loué et s'engage à le restituer dans l'état où il l'a reçu.</p>
          <p><strong>3. RETARD :</strong> Tout retard dans la restitution pourra faire l'objet d'une facturation supplémentaire.</p>
          <p><strong>4. DOMMAGES :</strong> Les dommages constatés lors du retour seront déduits de la caution.</p>
          <p><strong>5. ASSURANCE :</strong> Le matériel loué reste sous la responsabilité du locataire pendant toute la durée de la location.</p>
          <p><strong>6. ANNULATION :</strong> Toute annulation doit être signalée au moins 24h à l'avance.</p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">SIGNATURES ÉLECTRONIQUES</div>
        <div class="signature-section">
          <div class="signature-box">
            <p><strong>Le Locataire</strong></p>
            <p>${client.clientName}</p>
            <p style="color: #28a745; font-weight: bold;">✅ SIGNÉ ÉLECTRONIQUEMENT</p>
            <p>Date : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
            <p><small>Acceptation validée en présence de l'équipe CarpeStudentem</small></p>
          </div>
          <div class="signature-box">
            <p><strong>CarpeStudentem ASBL</strong></p>
            <p>Représentant légal</p>
            <p style="color: #28a745; font-weight: bold;">✅ SIGNÉ ÉLECTRONIQUEMENT</p>
            <p>Date : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
            <p><small>Signature électronique automatique lors du démarrage</small></p>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Ce contrat est généré automatiquement par le système de gestion CarpeStudentem</p>
        <p>Contrat n° ${client.id} - Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
      </div>
    </body>
    </html>
  `;
}

function generateInvoiceHTML(client, items) {
  let totalPrice = 0;
  let totalCaution = 0;

  const itemsHTML = items.map(({ location, item }) => {
    const itemPrice = calculateTotalPrice(item, location);
    const itemCaution = item.caution ? item.caution * location.qty : 0;
    const days = calculateDays(location.from, location.to);
    totalPrice += itemPrice;
    totalCaution += itemCaution;

    return `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${location.qty}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${days} jour${days > 1 ? 's' : ''}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.price}€/jour</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemPrice}€</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Facture - ${client.clientName}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          line-height: 1.4;
          color: #333;
        }
        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #17a2b8;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #17a2b8;
        }
        .invoice-info {
          text-align: right;
        }
        .invoice-title {
          font-size: 24px;
          font-weight: bold;
          color: #17a2b8;
          margin: 20px 0;
        }
        .section {
          margin: 20px 0;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #17a2b8;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        .billing-info {
          display: flex;
          justify-content: space-between;
          margin: 30px 0;
        }
        .billing-box {
          width: 45%;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #e1f5fe;
          font-weight: bold;
        }
        .total-section {
          width: 50%;
          margin-left: auto;
          margin-top: 20px;
        }
        .total-row {
          background-color: #e1f5fe;
          font-weight: bold;
        }
        .payment-info {
          background-color: #fff3cd;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #ffc107;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">CarpeStudentem ASBL</div>
          <div>Rue de l'hocaille 12</div>
          <div>1348 Louvain-la-Neuve</div>
          <div>Email: carpestudentem@gmail.com</div>
        </div>
        <div class="invoice-info">
          <h2 style="color: #17a2b8; margin: 0;">FACTURE</h2>
          <p><strong>N° :</strong> FAC-${client.id}</p>
          <p><strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
          <p><strong>Échéance :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      <div class="billing-info">
        <div class="billing-box">
          <h4 style="margin-top: 0; color: #17a2b8;">FACTURÉ À :</h4>
          <p><strong>${client.clientName}</strong></p>
          <p>${client.contactEmail}</p>
          ${client.contactPhone ? `<p>${client.contactPhone}</p>` : ''}
          ${client.associationName ? `<p>${client.associationName}</p>` : ''}
        </div>
        <div class="billing-box">
          <h4 style="margin-top: 0; color: #17a2b8;">PÉRIODE DE LOCATION :</h4>
          <p><strong>Du :</strong> ${formatDateTime(items[0].location.from, items[0].location.fromTime)}</p>
          <p><strong>Au :</strong> ${formatDateTime(items[0].location.to, items[0].location.toTime)}</p>
          <p><strong>Durée :</strong> ${calculateDays(items[0].location.from, items[0].location.to)} jour(s)</p>
          <p><strong>Facturé le :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">DÉTAIL DE LA FACTURATION</div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantité</th>
              <th>Durée</th>
              <th>Prix unitaire</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="total-section">
          <table>
            <tr>
              <td style="border: none; padding: 8px; text-align: right;"><strong>Sous-total :</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right; width: 100px;">${totalPrice}€</td>
            </tr>
            <tr>
              <td style="border: none; padding: 8px; text-align: right;"><strong>TVA (0%) :</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">0€</td>
            </tr>
            <tr class="total-row">
              <td style="border: none; padding: 8px; text-align: right; font-size: 18px;"><strong>TOTAL :</strong></td>
              <td style="border: 2px solid #17a2b8; padding: 8px; text-align: right; font-size: 18px; background-color: #e1f5fe;"><strong>${totalPrice}€</strong></td>
            </tr>
          </table>
        </div>
      </div>

      <div class="payment-info">
        <h4 style="margin-top: 0;">💰 CAUTION REMBOURSÉE</h4>
        <p>Caution de ${totalCaution}€ remboursée après vérification du matériel.</p>
        <p><strong>Montant net payé :</strong> ${totalPrice}€ (hors caution)</p>
      </div>

      ${client.requestComment ? `
        <div class="section">
          <div class="section-title">COMMENTAIRES</div>
          <p>${client.requestComment}</p>
        </div>
      ` : ''}

      <div class="footer">
        <p><strong>Merci pour votre confiance !</strong></p>
        <p>CarpeStudentem ASBL - Association étudiante de location de matériel</p>
        <p>Facture générée automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
      </div>
    </body>
    </html>
  `;
}

async function generatePDF(htmlContent, filename) {
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const filePath = path.join(documentsPath, filename);

    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    await browser.close();

    console.log(`📄 PDF généré: ${filename}`);
    return filePath;

  } catch (error) {
    console.error('❌ Erreur lors de la génération PDF:', error);
    throw error;
  }
}

async function generateContract(client, items) {
  const htmlContent = generateContractHTML(client, items);
  const clientNameForFile = client.clientName.replace(/[^a-zA-Z0-9\-_]/g, '-');
  const filename = `contrat-${clientNameForFile}-${client.id}-${Date.now()}.pdf`;
  return await generatePDF(htmlContent, filename);
}

async function generateInvoice(client, items) {
  const htmlContent = generateInvoiceHTML(client, items);
  const clientNameForFile = client.clientName.replace(/[^a-zA-Z0-9\-_]/g, '-');
  const filename = `facture-${clientNameForFile}-${client.id}-${Date.now()}.pdf`;
  return await generatePDF(htmlContent, filename);
}

function getDocumentsPath() {
  return documentsPath;
}

function listDocuments() {
  try {
    const files = fs.readdirSync(documentsPath)
      .filter(file => file.endsWith('.pdf'))
      .map(file => {
        const filePath = path.join(documentsPath, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created);

    return files;
  } catch (error) {
    console.error('❌ Erreur lors de la lecture des documents:', error);
    return [];
  }
}

module.exports = {
  generateContract,
  generateInvoice,
  getDocumentsPath,
  listDocuments
};