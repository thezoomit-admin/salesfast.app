import { Alert, Linking } from 'react-native';

import { ADMIN_CONTACT_EMAIL, ADMIN_CONTACT_WHATSAPP } from '@/constants/config';

const MESSAGE =
  'Salesfast accounts are created by your administrator. Use the credentials they shared with you.';

/** Offer email / WhatsApp / dismiss for admin contact. */
export function promptContactAdmin(title = 'Contact Us') {
  const buttons: {
    text: string;
    style?: 'cancel' | 'destructive' | 'default';
    onPress?: () => void;
  }[] = [];

  if (ADMIN_CONTACT_EMAIL) {
    buttons.push({
      text: 'Email admin',
      onPress: () => {
        void Linking.openURL(
          `mailto:${ADMIN_CONTACT_EMAIL}?subject=${encodeURIComponent(
            'Salesfast account request'
          )}`
        );
      },
    });
  }

  if (ADMIN_CONTACT_WHATSAPP) {
    const phone = ADMIN_CONTACT_WHATSAPP.replace(/\D/g, '');
    buttons.push({
      text: 'WhatsApp admin',
      onPress: () => {
        void Linking.openURL(
          `https://wa.me/${phone}?text=${encodeURIComponent(
            'Hi, I need a Salesfast CRM account.'
          )}`
        );
      },
    });
  }

  buttons.push({ text: 'OK', style: 'cancel' });

  Alert.alert(title, MESSAGE, buttons);
}
