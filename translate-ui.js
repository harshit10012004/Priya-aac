import { Platform } from 'react-native';
import { translate } from './api';

// ... existing code ...

// Replace the Google Cloud Translation implementation with our API-based translation
export const translateText = async (text, targetLanguage) => {
  try {
    if (Platform.OS === 'web') {
      // Use our API-based translation for web
      return await translate(text, targetLanguage);
    } else {
      // Use existing implementation for mobile
      const [translation] = await translateClient.translate(text, {
        to: targetLanguage,
      });
      return translation;
    }
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
};

// ... existing code ... 