/**
 * Service de notifications pour PWA
 */

let notificationPermission: NotificationPermission = 'default';

/**
 * Demande la permission pour les notifications
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('Ce navigateur ne supporte pas les notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    notificationPermission = 'granted';
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    notificationPermission = permission;
    return permission === 'granted';
  }

  return false;
};

/**
 * Envoie une notification
 */
export const sendNotification = async (
  title: string,
  options?: NotificationOptions
): Promise<void> => {
  if (!('Notification' in window)) {
    console.warn('Ce navigateur ne supporte pas les notifications');
    return;
  }

  // Vérifier la permission
  if (Notification.permission !== 'granted') {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.warn('Permission de notification refusée');
      return;
    }
  }

  // Envoyer la notification
  try {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'service-start',
      requireInteraction: false,
      ...options,
    });

    // Fermer automatiquement après 5 secondes
    setTimeout(() => {
      notification.close();
    }, 5000);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
  }
};

/**
 * Notification pour le démarrage d'un service
 */
export const notifyServiceStart = async (
  serviceName: string,
  clientName: string
): Promise<void> => {
  await sendNotification('Service démarré', {
    body: `${serviceName} - ${clientName}\nLe chronomètre a été lancé.`,
    icon: '/favicon.ico',
  });
};

