import React from 'react';
import { useTimer } from '../../hooks/useTimer';
import { notifyServiceStart } from '../../utils/notifications';
import type { Engagement } from '../../store/useAppData';
import { formatCurrency, formatDuration } from '../../lib/format';
import '../../pages/mobile.css';

interface ServiceDetails {
  serviceName: string;
  serviceDescription?: string | null;
  mainCategory?: string | null;
  subCategory?: string | null;
  price: number;
  duration: number;
}

interface ServiceTimerProps {
  engagement: Engagement;
  serviceName: string;
  clientName: string;
  serviceDetails?: ServiceDetails | null;
  onStop: (durationMinutes: number, comment?: string) => void;
  onCancel?: () => void;
}

const ServiceTimer: React.FC<ServiceTimerProps> = ({
  engagement,
  serviceName,
  clientName,
  serviceDetails,
  onStop,
  onCancel,
}) => {
  const timer = useTimer(0);
  const [hasStarted, setHasStarted] = React.useState(false);
  const [comment, setComment] = React.useState('');
  const [majoration, setMajoration] = React.useState('');
  const [pourboire, setPourboire] = React.useState('');
  const [showCommentModal, setShowCommentModal] = React.useState(false);

  const handleStart = async () => {
    timer.start();
    setHasStarted(true);
    
    // Envoyer une notification
    await notifyServiceStart(serviceName, clientName);
  };

  const handleStop = () => {
    console.log('⏸️ [ServiceTimer] ========== ARRÊT DEMANDÉ ==========');
    console.log('⏸️ [ServiceTimer] État du timer:', {
      elapsedSeconds: timer.elapsedSeconds,
      durationMinutes: Math.floor(timer.elapsedSeconds / 60),
      engagementId: engagement.id,
      serviceName,
      clientName,
    });
    timer.stop();
    // Ouvrir la modale de commentaire au lieu d'enregistrer directement
    console.log('⏸️ [ServiceTimer] Ouverture modale de commentaire');
    setShowCommentModal(true);
    console.log('⏸️ [ServiceTimer] ========== FIN ARRÊT DEMANDÉ ==========');
  };

  const handleSave = () => {
    const durationMinutes = Math.floor(timer.elapsedSeconds / 60);
    const finalComment = comment.trim() || undefined;
    const majorationValue = majoration.trim() ? parseFloat(majoration.trim().replace(',', '.')) : undefined;
    const pourboireValue = pourboire.trim() ? parseFloat(pourboire.trim().replace(',', '.')) : undefined;
    console.log('💾 [ServiceTimer] ========== ENREGISTREMENT ==========');
    console.log('💾 [ServiceTimer] Données à enregistrer:', {
      engagementId: engagement.id,
      durationMinutes,
      hasComment: !!finalComment,
      commentLength: finalComment?.length || 0,
      commentPreview: finalComment ? finalComment.substring(0, 50) + '...' : 'aucun',
      majoration: majorationValue,
      pourboire: pourboireValue,
    });
    onStop(durationMinutes, finalComment, majorationValue, pourboireValue);
    console.log('💾 [ServiceTimer] onStop appelé');
    setShowCommentModal(false);
    setComment('');
    setMajoration('');
    setPourboire('');
    console.log('💾 [ServiceTimer] ========== FIN ENREGISTREMENT ==========');
  };

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
      <div className="mobile-card" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="mobile-card__header">
          <h2 className="mobile-card__title">Chronomètre</h2>
          {onCancel && (
            <button type="button" onClick={onCancel} className="mobile-icon-button">
              ✕
            </button>
          )}
        </div>

        <div className="mobile-card__section">
          {/* Informations de la formule - toujours visibles */}
          {serviceDetails && (
            <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', margin: '0 0 8px 0' }}>
                  {serviceDetails.serviceName}
                </h3>
                {serviceDetails.serviceDescription && (
                  <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                    {serviceDetails.serviceDescription}
                  </p>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                {serviceDetails.mainCategory && (
                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Catégorie</span>
                    <span style={{ color: 'var(--text)', fontWeight: '600' }}>{serviceDetails.mainCategory}</span>
                  </div>
                )}
                {serviceDetails.subCategory && (
                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Sous-catégorie</span>
                    <span style={{ color: 'var(--text)', fontWeight: '600' }}>{serviceDetails.subCategory}</span>
                  </div>
                )}
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Prix</span>
                  <span style={{ color: 'var(--text)', fontWeight: '600' }}>{formatCurrency(serviceDetails.price)}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Temps estimé</span>
                  <span style={{ color: 'var(--text)', fontWeight: '600' }}>{formatDuration(serviceDetails.duration)}</span>
                </div>
              </div>
            </div>
          )}
          
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <p className="mobile-card__subtitle">{serviceName}</p>
            <p className="mobile-card__meta">{clientName}</p>
          </div>

          <div className="mobile-timer__clock-shell" style={{ marginBottom: '24px' }}>
            <div className="mobile-timer__clock">{timer.formattedTime}</div>
          </div>

          <div className="mobile-timer__controls">
            {!hasStarted ? (
              <button
                type="button"
                onClick={handleStart}
                className="mobile-button mobile-button--primary"
                style={{ width: '100%' }}
              >
                ▶️ Démarrer
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleStop}
                  className="mobile-button"
                  style={{ 
                    flex: 1,
                    background: 'var(--surface)',
                    borderColor: 'var(--color-primary)',
                    color: 'var(--color-primary)',
                    fontWeight: 600,
                  }}
                >
                  ⏹️ Arrêter
                </button>
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="mobile-button"
                    style={{ flex: 1 }}
                  >
                    Annuler
                  </button>
                )}
              </>
            )}
          </div>

          {hasStarted && (
            <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.85rem', color: 'var(--muted)' }}>
              Le service est en cours...
            </p>
          )}
        </div>
      </div>

      {/* Modale de commentaire après arrêt */}
      {showCommentModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div className="mobile-card" style={{ maxWidth: '400px', width: '100%' }}>
            <div className="mobile-card__header">
              <h2 className="mobile-card__title">Enregistrer la prestation</h2>
            </div>

            <div className="mobile-card__section">
              <p style={{ marginBottom: '16px', color: 'var(--text)', fontSize: '14px' }}>
                Durée : {timer.formattedTime}
              </p>
              
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="stop-comment"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--text)',
                  }}
                >
                  Commentaire (optionnel)
                </label>
                <textarea
                  id="stop-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ajoutez un commentaire sur la prestation réalisée..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label
                    htmlFor="stop-majoration"
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--text)',
                    }}
                  >
                    Majoration (€)
                  </label>
                  <input
                    id="stop-majoration"
                    type="text"
                    inputMode="decimal"
                    value={majoration}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9,.-]/g, '');
                      setMajoration(value);
                    }}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="stop-pourboire"
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--text)',
                    }}
                  >
                    Pourboire (€)
                  </label>
                  <input
                    id="stop-pourboire"
                    type="text"
                    inputMode="decimal"
                    value={pourboire}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9,.-]/g, '');
                      setPourboire(value);
                    }}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleSave}
                  className="mobile-button mobile-button--primary"
                  style={{ flex: 1 }}
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCommentModal(false);
                    timer.start(); // Reprendre le timer si on annule
                  }}
                  className="mobile-button"
                  style={{ flex: 1 }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceTimer;

