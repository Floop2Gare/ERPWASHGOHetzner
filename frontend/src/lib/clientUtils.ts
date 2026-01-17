/**
 * Utilitaires pour la gestion des clients
 * Fonctions centralisées pour éviter les duplications de code
 */

import type { Client, ClientContact, Lead } from '../store/useAppData';
import { BRAND_NAME } from './branding';
import { normalisePhone } from './phone';
import { splitContactName } from './format';

export interface EnsureClientFromLeadOptions {
  clients: Client[];
  addClient: (clientData: {
    type: 'company' | 'individual';
    name: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    siret: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    status: 'Actif' | 'Prospect';
    tags: string[];
    contacts: ClientContact[];
  }) => Client;
  addClientContact: (
    clientId: string,
    contactData: {
      firstName: string;
      lastName: string;
      email: string;
      mobile: string;
      roles: ('achat' | 'facturation' | 'technique')[];
      isBillingDefault: boolean;
    }
  ) => ClientContact | null;
  setClientBillingContact?: (clientId: string, contactId: string) => void;
  restoreClientContact?: (clientId: string, contactId: string) => void;
  getClient?: (clientId: string) => Client | undefined;
  siretOverride?: string;
  transferActivities?: (lead: Lead, clientId: string) => void;
}

/**
 * Convertit un Lead en Client, en créant un nouveau client si nécessaire
 * ou en retournant un client existant si trouvé par email/téléphone
 * 
 * Cette fonction unifie la logique qui était dupliquée dans :
 * - DevisPage.tsx
 * - LeadPage.tsx
 * - MobileDevisPage.tsx
 * - ServicePage.tsx
 */
export const ensureClientFromLead = (
  lead: Lead,
  options: EnsureClientFromLeadOptions
): Client => {
  const {
    clients,
    addClient,
    addClientContact,
    setClientBillingContact,
    restoreClientContact,
    getClient,
    siretOverride,
    transferActivities,
  } = options;

  const normalizedEmail = (lead.email || '').trim().toLowerCase();
  const normalizedPhone = normalisePhone(lead.phone || '');
  const normalizedCompanyName = (lead.company || '').trim().toLowerCase();
  const normalizedSiret = (lead.siret || '').trim();

  // Chercher un client existant par email
  const existingByEmail = normalizedEmail
    ? clients.find((client) =>
        client.contacts.some((contact) => contact.email.toLowerCase() === normalizedEmail)
      )
    : undefined;

  // Chercher un client existant par téléphone
  const existingByPhone = normalizedPhone
    ? clients.find((client) =>
        client.contacts.some(
          (contact) => normalisePhone(contact.mobile) === normalizedPhone
        )
      )
    : undefined;

  // Chercher un client existant par nom d'entreprise (pour les entreprises)
  const existingByCompanyName = normalizedCompanyName && lead.clientType === 'company'
    ? clients.find((client) => {
        if (client.type !== 'company') return false;
        const clientCompanyName = (client.companyName || client.name || '').trim().toLowerCase();
        return clientCompanyName === normalizedCompanyName;
      })
    : undefined;

  // Chercher un client existant par SIRET (pour les entreprises)
  const existingBySiret = normalizedSiret && lead.clientType === 'company'
    ? clients.find((client) => {
        if (client.type !== 'company') return false;
        return client.siret && client.siret.trim() === normalizedSiret;
      })
    : undefined;

  // Priorité: Email > Téléphone > SIRET > Nom d'entreprise
  const existingClient = existingByEmail ?? existingByPhone ?? existingBySiret ?? existingByCompanyName;

  // Si un client existe déjà
  if (existingClient) {
    // Si trouvé par email, restaurer le contact s'il est inactif
    if (existingByEmail && restoreClientContact) {
      const contact = existingClient.contacts.find(
        (item) => item.email.toLowerCase() === normalizedEmail
      );
      if (contact && !contact.active) {
        restoreClientContact(existingClient.id, contact.id);
      }
    } 
    // Si trouvé par téléphone mais pas par email, créer un contact
    else if (normalizedEmail && addClientContact) {
      const { firstName, lastName } = splitContactName(lead.contact);
      const createdContact = addClientContact(existingClient.id, {
        firstName: firstName || lead.company || existingClient.name || 'Contact',
        lastName: lastName || '',
        email: lead.email || 'contact@client.fr',
        mobile: lead.phone || '+33 6 00 00 00 00',
        roles: ['facturation'],
        isBillingDefault: !existingClient.contacts.some(
          (contact) => contact.active && contact.isBillingDefault
        ),
      });
      if (createdContact?.isBillingDefault && setClientBillingContact) {
        setClientBillingContact(existingClient.id, createdContact.id);
      }
    }

    // Transférer les activités si la fonction est fournie
    if (transferActivities) {
      transferActivities(lead, existingClient.id);
    }

    return getClient ? (getClient(existingClient.id) ?? existingClient) : existingClient;
  }

  // Créer un nouveau client
  const clientType = lead.clientType || 'company';
  const { firstName, lastName } = splitContactName(lead.contact);

  let clientName = '';
  let companyName: string | null = null;
  let clientFirstName: string | null = null;
  let clientLastName: string | null = null;
  let finalSiret = '';

  if (clientType === 'individual') {
    // Pour un particulier : utiliser le prénom et nom
    clientName = [firstName, lastName].filter(Boolean).join(' ') || lead.contact || `Client ${BRAND_NAME}`;
    clientFirstName = firstName || null;
    clientLastName = lastName || null;
    companyName = null;
    finalSiret = ''; // Pas de SIRET pour un particulier
  } else {
    // Pour une entreprise : utiliser le nom de l'entreprise
    const fallbackName = lead.company || lead.contact || `Organisation ${BRAND_NAME}`;
    clientName = fallbackName;
    companyName = fallbackName;
    clientFirstName = null;
    clientLastName = null;
    // Utiliser le SIRET du lead s'il existe, sinon celui du formulaire, sinon générer un temporaire
    const sanitizedName = fallbackName.toLowerCase().replace(/[^a-z0-9]/g, '');
    finalSiret = (lead.siret?.trim() || siretOverride?.trim() || `TMP-${sanitizedName.slice(0, 8) || 'client'}-${Date.now()}`);
  }

  const created = addClient({
    type: clientType,
    name: clientName,
    companyName: companyName,
    firstName: clientFirstName,
    lastName: clientLastName,
    siret: finalSiret,
    email: lead.email || 'contact@client.fr',
    phone: lead.phone || '+33 6 00 00 00 00',
    address: lead.address || '',
    city: lead.city || '',
    status: 'Prospect',
    tags: lead.tags || [],
    contacts: [],
  });

  // Ajouter le contact si c'est une entreprise (pour les particuliers, le contact est déjà dans le client)
  if (clientType === 'company' && (firstName || lastName) && addClientContact) {
    const newContact = addClientContact(created.id, {
      firstName: firstName || clientName,
      lastName: lastName || '',
      email: lead.email || 'contact@client.fr',
      mobile: lead.phone || '+33 6 00 00 00 00',
      roles: ['facturation'],
      isBillingDefault: true,
    });
    if (newContact && setClientBillingContact) {
      setClientBillingContact(created.id, newContact.id);
    }
  }

  // Transférer les activités si la fonction est fournie
  if (transferActivities) {
    transferActivities(lead, created.id);
  }

  return getClient ? (getClient(created.id) ?? created) : created;
};

/**
 * Trouve un client correspondant à un lead SANS créer de nouveau client
 * Utilisé pour vérifier si un client existe déjà avant de créer un devis
 */
export const findClientFromLead = (lead: Lead, clients: Client[]): Client | null => {
  const normalizedEmail = (lead.email || '').trim().toLowerCase();
  const normalizedPhone = normalisePhone(lead.phone || '');
  const normalizedCompanyName = (lead.company || '').trim().toLowerCase();
  const normalizedSiret = (lead.siret || '').trim();

  // Chercher un client existant par email
  const existingByEmail = normalizedEmail
    ? clients.find((client) =>
        client.contacts.some((contact) => contact.email.toLowerCase() === normalizedEmail)
      )
    : undefined;

  // Chercher un client existant par téléphone
  const existingByPhone = normalizedPhone
    ? clients.find((client) =>
        client.contacts.some(
          (contact) => normalisePhone(contact.mobile) === normalizedPhone
        )
      )
    : undefined;

  // Chercher un client existant par nom d'entreprise (pour les entreprises)
  const existingByCompanyName = normalizedCompanyName && lead.clientType === 'company'
    ? clients.find((client) => {
        if (client.type !== 'company') return false;
        const clientCompanyName = (client.companyName || client.name || '').trim().toLowerCase();
        return clientCompanyName === normalizedCompanyName;
      })
    : undefined;

  // Chercher un client existant par SIRET (pour les entreprises)
  const existingBySiret = normalizedSiret && lead.clientType === 'company'
    ? clients.find((client) => {
        if (client.type !== 'company') return false;
        return client.siret && client.siret.trim() === normalizedSiret;
      })
    : undefined;

  // Priorité: Email > Téléphone > SIRET > Nom d'entreprise
  return existingByEmail ?? existingByPhone ?? existingBySiret ?? existingByCompanyName ?? null;
};

/**
 * Version simplifiée pour MobileDevisPage qui retourne un client temporaire
 * sans le créer réellement dans la base
 */
export const createTemporaryClientFromLead = (lead: Lead): Client => {
  const { firstName, lastName } = splitContactName(lead.contact);
  
  return {
    id: `lead-${lead.id}`,
    type: lead.clientType === 'individual' ? 'individual' : 'company',
    name: lead.company || lead.contact || 'Prospect',
    companyName: lead.company || null,
    firstName: lead.clientType === 'individual' ? (firstName || null) : null,
    lastName: lead.clientType === 'individual' ? (lastName || null) : null,
    siret: lead.siret || '',
    email: lead.email || '',
    phone: lead.phone || '',
    address: lead.address || '',
    city: lead.city || '',
    status: 'Actif',
    tags: lead.tags || [],
    lastService: null,
    contacts: lead.email
      ? [
          {
            id: `contact-${lead.id}`,
            firstName: firstName || 'Contact',
            lastName: lastName || '',
            email: lead.email,
            mobile: lead.phone || '',
            roles: ['facturation'],
            isBillingDefault: true,
            active: true,
          },
        ]
      : [],
  };
};



