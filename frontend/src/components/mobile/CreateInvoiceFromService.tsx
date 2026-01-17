import React, { useState } from 'react';
import { generateInvoicePdf, generateInvoiceFileName } from '../../lib/invoice';
import { parseISO, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Engagement, Client, Service, Company } from '../../store/useAppData';
import '../../pages/mobile.css';

interface CreateInvoiceFromServiceProps {
  engagement: Engagement;
  client: Client;
  service: Service;
  company: Company;
  onSuccess: (invoiceNumber: string) => void;
  onCancel: () => void;
}

const CreateInvoiceFromService: React.FC<CreateInvoiceFromServiceProps> = ({
  engagement,
  client,
  service,
  company,
  onSuccess,
  onCancel,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(engagement.invoiceNumber || '');

  // Générer un numéro de facture si nécessaire
  React.useEffect(() => {
    if (!invoiceNumber) {
      const now = new Date();
      const year = format(now, 'yyyy');
      const month = format(now, 'MM');
      const day = format(now, 'dd');
      const random = Math.floor(Math.random() * 1000).toString().padStart(4, '0');
      setInvoiceNumber(`FAC-${year}${month}${day}-${random}`);
    }
  }, [invoiceNumber]);

  const handleCreateInvoice = async () => {
    setIsGenerating(true);
    try {
      const options = service.options.filter((opt) => engagement.optionIds.includes(opt.id));
      const engDate = engagement.scheduledAt ? parseISO(engagement.scheduledAt) : new Date();

      const doc = generateInvoicePdf({
        documentNumber: invoiceNumber,
        issueDate: new Date(),
        serviceDate: engDate,
        company: {
          ...company,
          vatNumber: company.vatNumber || '',
          iban: company.iban || '',
          bic: company.bic || '',
        },
        client,
        service,
        options,
        optionOverrides: engagement.optionOverrides || {},
        additionalCharge: engagement.additionalCharge || 0,
        vatRate: 20,
        vatEnabled: engagement.invoiceVatEnabled ?? company.vatEnabled,
        status: engagement.status,
        supportType: engagement.supportType,
        supportDetail: engagement.supportDetail,
      });

      // Télécharger automatiquement la facture
      doc.save(generateInvoiceFileName(invoiceNumber, client.name, new Date()));

      // Mettre à jour l'engagement avec le numéro de facture
      onSuccess(invoiceNumber);
    } catch (error) {
      console.error('Erreur lors de la génération de la facture:', error);
      alert('Erreur lors de la génération de la facture.');
      setIsGenerating(false);
    }
  };

  const durationText = engagement.mobileDurationMinutes
    ? `${Math.floor(engagement.mobileDurationMinutes / 60)}h${(engagement.mobileDurationMinutes % 60).toString().padStart(2, '0')}`
    : 'Non enregistrée';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div className="mobile-card" style={{ maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="mobile-card__header">
          <h2 className="mobile-card__title">Créer une facture</h2>
          <button type="button" onClick={onCancel} className="mobile-icon-button">
            ✕
          </button>
        </div>

        <div className="mobile-card__section">
          <div className="mobile-detail-summary">
            <div className="mobile-detail-summary__item">
              <span className="mobile-detail-summary__label">Client</span>
              <p className="mobile-detail-summary__value">{client.name}</p>
            </div>

            <div className="mobile-detail-summary__item">
              <span className="mobile-detail-summary__label">Service</span>
              <p className="mobile-detail-summary__value">{service.name}</p>
            </div>

            <div className="mobile-detail-summary__item">
              <span className="mobile-detail-summary__label">Date</span>
              <p className="mobile-detail-summary__value">
                {engagement.scheduledAt
                  ? format(parseISO(engagement.scheduledAt), 'd MMMM yyyy à HH:mm', { locale: fr })
                  : 'Non définie'}
              </p>
            </div>

            <div className="mobile-detail-summary__item">
              <span className="mobile-detail-summary__label">Durée réelle</span>
              <p className="mobile-detail-summary__value">{durationText}</p>
            </div>
          </div>

          <div className="mobile-field">
            <label htmlFor="invoice-number">
              <span>Numéro de facture</span>
            </label>
            <input
              id="invoice-number"
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="FAC-YYYYMMDD-XXXX"
            />
          </div>

          <div className="mobile-actions" style={{ marginTop: '24px' }}>
            <button
              type="button"
              onClick={onCancel}
              className="mobile-button"
              disabled={isGenerating}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleCreateInvoice}
              className="mobile-button mobile-button--primary"
              disabled={isGenerating || !invoiceNumber}
            >
              {isGenerating ? 'Génération...' : '💰 Créer la facture'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoiceFromService;

