const nodemailer = require('nodemailer');

// Configuration email - sera initialisée par index.js
let emailTransporter = null;

// Fonction pour initialiser le transporter avec les variables d'environnement
function initializeEmailService(emailConfig) {
  emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailConfig.EMAIL_USER,
      pass: emailConfig.EMAIL_PASS
    }
  });
  return emailTransporter;
}

// Test de la configuration email
async function testEmailConfig() {
  try {
    if (!emailTransporter) {
      console.error('❌ EmailService non initialisé');
      return;
    }
    console.log('🧪 Test de la configuration email...');
    await emailTransporter.verify();
    console.log('✅ Configuration email OK');
  } catch (error) {
    console.error('❌ Problème configuration email:', error.message);
  }
}

// Fonction pour envoyer un email de notification à l'admin
async function sendAdminNotification(client, items) {
  try {
    console.log('🔄 Tentative d\'envoi d\'email groupé à l\'admin...');

    // Calculer les totaux
    let totalPrice = 0;
    let totalCaution = 0;
    
    const itemsHtml = items.map(({ location, item }) => {
      const itemPrice = item.price ? item.price * location.qty : 0;
      const itemCaution = item.caution ? item.caution * location.qty : 0;
      totalPrice += itemPrice;
      totalCaution += itemCaution;
      
      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${location.qty}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemPrice}€</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemCaution}€</td>
        </tr>
      `;
    }).join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `🎯 Nouvelle demande de location - ${items.length} article(s)`,
      html: `
        <h2>Nouvelle demande de location</h2>
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h3>📋 Détails de la demande (${items.length} article(s))</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f4f4f4;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Article</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Quantité</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Prix</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Caution</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #f9f9f9; font-weight: bold;">
                <td style="border: 1px solid #ddd; padding: 8px;" colspan="2">TOTAL</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalPrice}€</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalCaution}€</td>
              </tr>
            </tfoot>
          </table>
          
          <ul>
            <li><strong>Du :</strong> ${new Date(client.from).toLocaleDateString('fr-FR')} à ${new Date(client.from).toLocaleTimeString('fr-FR')}</li>
            <li><strong>Au :</strong> ${new Date(client.to).toLocaleDateString('fr-FR')} à ${new Date(client.to).toLocaleTimeString('fr-FR')}</li>
          </ul>
          
          <h3>👤 Informations client</h3>
          <ul>
            <li><strong>Nom :</strong> ${client.clientName}</li>
            <li><strong>Email :</strong> ${client.contactEmail}</li>
            <li><strong>Téléphone :</strong> ${client.contactPhone}</li>
            ${client.associationName ? `<li><strong>Association :</strong> ${client.associationName}</li>` : ''}
          </ul>
          
          <h3>📝 Commentaire</h3>
          <p>${client.requestComment || 'Aucun commentaire'}</p>
          
          <hr>
          <p><small>Demande créée le ${new Date().toLocaleString('fr-FR')} via <strong>Location-app</strong></small></p>
        </div>
      `
    };

    console.log('📬 Options email admin:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const result = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Email de notification admin envoyé avec succès:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Erreur détaillée envoi email admin:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    throw error;
  }
}

// Fonction pour envoyer un email de confirmation au client
async function sendClientConfirmation(client, items) {
  try {
    console.log('🔄 Tentative d\'envoi d\'email de confirmation au client...');

    // Calculer les totaux
    let totalPrice = 0;
    let totalCaution = 0;
    
    const itemsHtml = items.map(({ location, item }) => {
      const itemPrice = item.price ? item.price * location.qty : 0;
      const itemCaution = item.caution ? item.caution * location.qty : 0;
      totalPrice += itemPrice;
      totalCaution += itemCaution;
      
      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${location.qty}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemPrice}€</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemCaution}€</td>
        </tr>
      `;
    }).join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: client.contactEmail,
      subject: `✅ Confirmation de votre demande de location`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">✅ Demande reçue !</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <h2>Bonjour ${client.clientName},</h2>
            <p>Nous avons bien reçu votre demande de location. Voici le récapitulatif :</p>
          </div>
          
          <div style="padding: 20px;">
            <h3>📋 Votre commande (${items.length} article${items.length > 1 ? 's' : ''})</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f4f4f4;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Article</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Quantité</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Prix</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Caution</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr style="background-color: #e8f5e8; font-weight: bold;">
                  <td style="border: 1px solid #ddd; padding: 8px;" colspan="2">TOTAL</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalPrice}€</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalCaution}€</td>
                </tr>
              </tfoot>
            </table>
            
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0;">📅 Période de location</h4>
              <p style="margin: 5px 0;"><strong>Du :</strong> ${new Date(client.from).toLocaleDateString('fr-FR')} à ${new Date(client.from).toLocaleTimeString('fr-FR')}</p>
              <p style="margin: 5px 0;"><strong>Au :</strong> ${new Date(client.to).toLocaleDateString('fr-FR')} à ${new Date(client.to).toLocaleTimeString('fr-FR')}</p>
            </div>
            
            ${client.requestComment ? `
              <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4 style="margin-top: 0;">📝 Votre commentaire</h4>
                <p style="margin: 5px 0;">${client.requestComment}</p>
              </div>
            ` : ''}
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h4 style="margin-top: 0;">⏳ Prochaines étapes</h4>
              <ul style="margin: 5px 0; padding-left: 20px;">
                <li>Votre demande est en cours de traitement</li>
                <li>Nous vous contacterons sous 24h pour confirmer la disponibilité</li>
                <li>Le paiement se fera lors de la récupération du matériel</li>
                <li>Nous privilégions le paiement en QR code via l'application bancaire</li>
              </ul>
            </div>
            
            <div style="text-align: center; padding: 20px; border-top: 1px solid #eee; margin-top: 30px;">
              <p style="color: #666; font-size: 14px;">
                Une question ? Contactez-nous :<br>
                📧 ${process.env.ADMIN_EMAIL}<br>
                📱 Ou répondez directement à cet email
              </p>
            </div>
          </div>
          
          <div style="background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">Merci de faire confiance à notre service de location !</p>
            <p style="margin: 5px 0 0 0;">📍 Location-app / CarpeStudentem- ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      `
    };

    console.log('📬 Options email client:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const result = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Email de confirmation client envoyé avec succès:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Erreur détaillée envoi email client:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    throw error;
  }
}

module.exports = {
  initializeEmailService,
  testEmailConfig,
  sendAdminNotification,
  sendClientConfirmation
};
