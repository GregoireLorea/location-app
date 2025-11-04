const nodemailer = require('nodemailer');

// Fonction utilitaire pour formater les dates avec heures
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
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

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
    console.log('🔄 Tentative d\'envoi d\'email à l\'admin...');

    if (!emailTransporter) {
      console.error('❌ Transporteur email non initialisé');
      throw new Error('Service email non initialisé');
    }

    if (!process.env.ADMIN_EMAIL) {
      console.error('❌ ADMIN_EMAIL non défini');
      throw new Error('ADMIN_EMAIL non configuré');
    }

    let totalPrice = 0;
    let totalCaution = 0;

    const itemsHtml = items.map(({ location, item }) => {
      const days = calculateDays(location.from, location.to);
      const itemPrice = (item.price || 0) * location.qty * days;
      const itemCaution = (item.caution || 0) * location.qty;
      totalPrice += itemPrice;
      totalCaution += itemCaution;

      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${location.qty}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${days} jour${days > 1 ? 's' : ''}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.price || 0}€/jour</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemPrice.toFixed(2)}€</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemCaution.toFixed(2)}€</td>
        </tr>
      `;
    }).join('');

    const platformButton = `
      <div style="text-align: center; margin: 20px 0;">
        <a href="${process.env.APP_BASE_URL || 'https://location.carpestudentem.be/login.html'}"
           style="display: inline-block; padding: 15px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          🏠 Aller sur la plateforme de location
        </a>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `🎯 Nouvelle demande de location - ${items.length} article(s) - ACTION REQUISE`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <div style="background-color: #ffc107; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🎯 Nouvelle demande à valider</h1>
          </div>

          <div style="padding: 20px; background-color: #fff3cd;">
            <h2>Action requise</h2>
            <p><strong>Une nouvelle demande de location nécessite votre validation.</strong></p>
          </div>

          <div style="padding: 20px;">
            <h3>📋 Détails de la demande (${items.length} article(s))</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f4f4f4;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Article</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Quantité</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Durée</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Prix unitaire</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Prix total</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Caution</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr style="background-color: #f9f9f9; font-weight: bold;">
                  <td style="border: 1px solid #ddd; padding: 8px;" colspan="4">TOTAL</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalPrice.toFixed(2)}€</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalCaution.toFixed(2)}€</td>
                </tr>
              </tfoot>
            </table>

            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0;">📅 Période demandée</h4>
              <p style="margin: 5px 0;"><strong>Du :</strong> ${formatDateTime(client.from, client.fromTime)}</p>
              <p style="margin: 5px 0;"><strong>Au :</strong> ${formatDateTime(client.to, client.toTime)}</p>
            </div>

            <h3>👤 Informations client</h3>
            <ul>
              <li><strong>Nom :</strong> ${client.clientName}</li>
              <li><strong>Email :</strong> ${client.contactEmail}</li>
              <li><strong>Téléphone :</strong> ${client.contactPhone}</li>
              ${client.associationName ? `<li><strong>Association :</strong> ${client.associationName}</li>` : ''}
            </ul>

            <h3>📝 Commentaire</h3>
            <p>${client.requestComment || 'Aucun commentaire'}</p>

            <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 30px 0; border-left: 4px solid #28a745;">
              <h3 style="margin-top: 0; color: #155724;">⚡ Gérer cette demande</h3>
              <p style="margin: 10px 0; text-align: center; font-size: 16px;">Cliquez sur le bouton ci-dessous pour accéder à la plateforme et traiter cette demande :</p>
              ${platformButton}
            </div>

            <hr>
            <p><small>Demande créée le ${new Date().toLocaleString('fr-FR')} via <strong>Location-app</strong><br>
            Le client a reçu un email de confirmation de réception.</small></p>
          </div>
        </div>
      `
    };

    const result = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Email de notification admin envoyé avec succès:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi email admin:', error.message);
    throw error;
  }
}

// Fonction pour envoyer un email de demande reçue au client (statut pending)
async function sendClientPendingNotification(client, items) {
  try {
    console.log('🔄 Tentative d\'envoi d\'email de demande reçue au client...');

    let totalPrice = 0;
    let totalCaution = 0;

    const itemsHtml = items.map(({ location, item }) => {
      const days = calculateDays(location.from, location.to);
      const itemPrice = (item.price || 0) * location.qty * days;
      const itemCaution = (item.caution || 0) * location.qty;
      totalPrice += itemPrice;
      totalCaution += itemCaution;

      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${location.qty}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${days} jour${days > 1 ? 's' : ''}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemPrice.toFixed(2)}€</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemCaution.toFixed(2)}€</td>
        </tr>
      `;
    }).join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: client.contactEmail,
      subject: `📨 Demande de location reçue - En attente de validation`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ffc107; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">📨 Demande reçue !</h1>
          </div>

          <div style="padding: 20px; background-color: #f9f9f9;">
            <h2>Bonjour ${client.clientName},</h2>
            <p>Nous avons bien reçu votre demande de location. Voici le récapitulatif :</p>
          </div>

          <div style="padding: 20px;">
            <h3>📋 Votre demande (${items.length} article${items.length > 1 ? 's' : ''})</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f4f4f4;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Article</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Quantité</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Durée</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Prix</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Caution</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr style="background-color: #fff3cd; font-weight: bold;">
                  <td style="border: 1px solid #ddd; padding: 8px;" colspan="3">TOTAL</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalPrice.toFixed(2)}€</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalCaution.toFixed(2)}€</td>
                </tr>
              </tfoot>
            </table>

            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0;">📅 Période de location demandée</h4>
              <p style="margin: 5px 0;"><strong>Du :</strong> ${formatDateTime(client.from, client.fromTime)}</p>
              <p style="margin: 5px 0;"><strong>Au :</strong> ${formatDateTime(client.to, client.toTime)}</p>
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
                <li><strong>Votre demande est en attente de validation</strong></li>
                <li>Nous étudions votre demande et la disponibilité du matériel</li>
                <li>Vous recevrez une réponse sous 24-48h avec la confirmation ou le refus</li>
                <li>Si acceptée, nous vous communiquerons les modalités de récupération</li>
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
            <p style="margin: 0;">Merci de nous faire confiance !</p>
            <p style="margin: 5px 0 0 0;">📍 Location-app / CarpeStudentem - ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      `
    };

    const result = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Email de demande reçue envoyé avec succès:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi email client (pending):', error.message);
    throw error;
  }
}

// Fonction pour envoyer un email de confirmation au client (approuvé)
async function sendClientConfirmation(client, items) {
  try {
    console.log('🔄 Tentative d\'envoi d\'email de confirmation au client...');

    let totalPrice = 0;
    let totalCaution = 0;

    const itemsHtml = items.map(({ location, item }) => {
      const days = calculateDays(location.from, location.to);
      const itemPrice = (item.price || 0) * location.qty * days;
      const itemCaution = (item.caution || 0) * location.qty;
      totalPrice += itemPrice;
      totalCaution += itemCaution;

      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${location.qty}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${days} jour${days > 1 ? 's' : ''}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.price || 0}€/jour</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemPrice.toFixed(2)}€</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemCaution.toFixed(2)}€</td>
        </tr>
      `;
    }).join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: client.contactEmail,
      subject: `✅ Demande de location APPROUVÉE - Détails de récupération`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">✅ Demande APPROUVÉE !</h1>
          </div>

          <div style="padding: 20px; background-color: #e8f5e8;">
            <h2>Excellente nouvelle ${client.clientName} !</h2>
            <p><strong>Votre demande de location a été approuvée.</strong> Voici les détails pour récupérer votre matériel :</p>
          </div>

          <div style="padding: 20px;">
            <h3>📋 Matériel approuvé (${items.length} article${items.length > 1 ? 's' : ''})</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f4f4f4;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Article</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Quantité</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Durée</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Prix unitaire</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Prix total</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Caution</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr style="background-color: #e8f5e8; font-weight: bold;">
                  <td style="border: 1px solid #ddd; padding: 8px;" colspan="4">TOTAL</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalPrice.toFixed(2)}€</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalCaution.toFixed(2)}€</td>
                </tr>
              </tfoot>
            </table>

            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0;">📅 Période de location</h4>
              <p style="margin: 5px 0;"><strong>Du :</strong> ${formatDateTime(client.from, client.fromTime)}</p>
              <p style="margin: 5px 0;"><strong>Au :</strong> ${formatDateTime(client.to, client.toTime)}</p>
            </div>

            ${client.requestComment ? `
              <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4 style="margin-top: 0;">📝 Votre commentaire</h4>
                <p style="margin: 5px 0;">${client.requestComment}</p>
              </div>
            ` : ''}

            <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h4 style="margin-top: 0;">📍 Récupération du matériel</h4>
              <ul style="margin: 5px 0; padding-left: 20px;">
                <li><strong>Date/heure :</strong> ${formatDateTime(client.from, client.fromTime)}</li>
                <li><strong>Lieu :</strong> CarpeStudentem - Rue de l'hocaille 12, 1348 Louvain-la-Neuve</li>
                <li><strong>Retour :</strong> ${formatDateTime(client.to, client.toTime)}</li>
              </ul>
              <div style="background-color: #fff3cd; padding: 10px; border-radius: 3px; margin-top: 10px; border: 1px solid #ffeaa7;">
                <p style="margin: 0; font-weight: bold; color: #856404;">⏰ IMPORTANT : Veuillez vous présenter exactement à ${client.fromTime} pour récupérer votre matériel. La ponctualité est essentielle pour une gestion efficace des locations.</p>
              </div>
            </div>

            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h4 style="margin-top: 0;">⚠️ Important</h4>
              <ul style="margin: 5px 0; padding-left: 20px;">
                <li>Matériel à rendre en bon état et propre</li>
                <li>Le matériel est à venir chercher à notre kot, qui se situe Rue de l'hocaille 12, 1348 Louvain-la-Neuve</li>
                <li>Merci d'être ponctuel(le) pour la récupération et le retour, et d'être là à l'heure convenue</li>
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
            <p style="margin: 5px 0 0 0;">📍 Location-app / CarpeStudentem - ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      `
    };

    const result = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Email d\'approbation client envoyé avec succès:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi email client (approved):', error.message);
    throw error;
  }
}

// Fonction pour envoyer un email de suppression de location au client
async function sendClientDeletion(client, items, reason = '') {
  try {
    console.log('🔄 Tentative d\'envoi d\'email d\'annulation au client...');

    let totalPrice = 0;
    let totalCaution = 0;

    const itemsHtml = items.map(({ location, item }) => {
      const days = calculateDays(location.from, location.to);
      const itemPrice = (item.price || 0) * location.qty * days;
      const itemCaution = (item.caution || 0) * location.qty;
      totalPrice += itemPrice;
      totalCaution += itemCaution;

      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${location.qty}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${days} jour${days > 1 ? 's' : ''}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemPrice.toFixed(2)}€</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemCaution.toFixed(2)}€</td>
        </tr>
      `;
    }).join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: client.contactEmail,
      subject: `🗑️ Annulation de votre location`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🗑️ Location annulée</h1>
          </div>

          <div style="padding: 20px; background-color: #f8d7da;">
            <h2>Bonjour ${client.clientName},</h2>
            <p>Nous vous informons que votre location a été annulée par notre équipe.</p>
          </div>

          <div style="padding: 20px;">
            <h3>📋 Location annulée (${items.length} article${items.length > 1 ? 's' : ''})</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f4f4f4;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Article</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Quantité</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Durée</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Prix</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Caution</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr style="background-color: #f8d7da; font-weight: bold;">
                  <td style="border: 1px solid #ddd; padding: 8px;" colspan="3">TOTAL</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalPrice.toFixed(2)}€</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalCaution.toFixed(2)}€</td>
                </tr>
              </tfoot>
            </table>

            <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0;">📅 Période qui était prévue</h4>
              <p style="margin: 5px 0;"><strong>Du :</strong> ${formatDateTime(client.from, client.fromTime)}</p>
              <p style="margin: 5px 0;"><strong>Au :</strong> ${formatDateTime(client.to, client.toTime)}</p>
            </div>

            ${reason ? `
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4 style="margin-top: 0;">📝 Raison de l'annulation</h4>
                <p style="margin: 5px 0;">${reason}</p>
              </div>
            ` : ''}

            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8;">
              <h4 style="margin-top: 0;">💡 Que faire maintenant ?</h4>
              <ul style="margin: 5px 0; padding-left: 20px;">
                <li>Vous pouvez refaire une nouvelle demande de location à tout moment</li>
                <li>Consultez notre catalogue pour d'autres options</li>
                <li>Contactez-nous si vous avez des questions</li>
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
            <p style="margin: 0;">Nous nous excusons pour tout inconvénient causé</p>
            <p style="margin: 5px 0 0 0;">📍 Location-app / CarpeStudentem - ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      `
    };

    const result = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Email d\'annulation envoyé avec succès:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi email client (deleted):', error.message);
    throw error;
  }
}

// Fonction pour envoyer un email de refus au client
async function sendClientRejection(client, items, reason = '') {
  try {
    console.log('🔄 Tentative d\'envoi d\'email de refus au client...');

    let totalPrice = 0;
    let totalCaution = 0;

    const itemsHtml = items.map(({ location, item }) => {
      const days = calculateDays(location.from, location.to);
      const itemPrice = (item.price || 0) * location.qty * days;
      const itemCaution = (item.caution || 0) * location.qty;
      totalPrice += itemPrice;
      totalCaution += itemCaution;

      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${location.qty}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${days} jour${days > 1 ? 's' : ''}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemPrice.toFixed(2)}€</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${itemCaution.toFixed(2)}€</td>
        </tr>
      `;
    }).join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: client.contactEmail,
      subject: `❌ Demande de location refusée`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">❌ Demande refusée</h1>
          </div>

          <div style="padding: 20px; background-color: #f8d7da;">
            <h2>Bonjour ${client.clientName},</h2>
            <p>Nous sommes désolés de vous informer que votre demande de location ne peut pas être acceptée.</p>
          </div>

          <div style="padding: 20px;">
            <h3>📋 Demande concernée (${items.length} article${items.length > 1 ? 's' : ''})</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f4f4f4;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Article</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Quantité</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Durée</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Prix</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Caution</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr style="background-color: #f8d7da; font-weight: bold;">
                  <td style="border: 1px solid #ddd; padding: 8px;" colspan="3">TOTAL</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalPrice.toFixed(2)}€</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalCaution.toFixed(2)}€</td>
                </tr>
              </tfoot>
            </table>

            <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0;">📅 Période demandée</h4>
              <p style="margin: 5px 0;"><strong>Du :</strong> ${formatDateTime(client.from, client.fromTime)}</p>
              <p style="margin: 5px 0;"><strong>Au :</strong> ${formatDateTime(client.to, client.toTime)}</p>
            </div>

            ${reason ? `
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4 style="margin-top: 0;">📝 Raison du refus</h4>
                <p style="margin: 5px 0;">${reason}</p>
              </div>
            ` : ''}

            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8;">
              <h4 style="margin-top: 0;">💡 Suggestions</h4>
              <ul style="margin: 5px 0; padding-left: 20px;">
                <li>Vérifiez la disponibilité pour d'autres dates</li>
                <li>Consultez notre catalogue pour des alternatives</li>
                <li>Contactez-nous pour discuter d'autres options</li>
                <li>Vous pouvez refaire une demande à tout moment</li>
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
            <p style="margin: 0;">Merci de votre compréhension</p>
            <p style="margin: 5px 0 0 0;">📍 Location-app / CarpeStudentem - ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      `
    };

    const result = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Email de refus client envoyé avec succès:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi email client (rejected):', error.message);
    throw error;
  }
}

module.exports = {
  initializeEmailService,
  testEmailConfig,
  sendAdminNotification,
  sendClientPendingNotification,
  sendClientConfirmation,
  sendClientRejection,
  sendClientDeletion
};
