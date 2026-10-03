import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';

/**
 * Minimal multilingual layer: English, Hindi and Marathi. Any string shown to
 * the farmer can be added to the dictionary and looked up with t(). Growth is
 * additive - missing keys fall back to English rather than breaking the UI.
 */

export type Language = 'en' | 'hi' | 'mr';

type Dict = Record<Language, Record<string, string>>;

const STRINGS: Dict = {
  en: {
    'nav.home': 'Home',
    'nav.shop': 'Feed Store',
    'nav.quiz': 'AI Ration Quiz',
    'nav.subscriptions': 'Subscriptions',
    'nav.services': 'Services',
    'nav.offers': 'Offers',
    'header.signin': 'Sign in / Register',
    'hero.badge': 'Next-Gen AgroFeed Pro SaaS & Cattle Nutrition',
    'hero.title': 'Better Nutrition for Healthier Livestock',
    'hero.subtitle':
      'Scientific compound feed pellets, high-fat bypass protein, and chelated calcium for higher milk yield and healthier herds.',
    'cta.shop': 'Shop Cattle Feed',
    'cta.quiz': 'AI Ration Calculator',
    'footer.categories': 'Feed Categories',
    'footer.tools': 'Smart Farmer Tools',
    'footer.store': 'Central Feed Hub',
    'cart.add': 'Add to Cart',
    'cart.view': 'Cart',
    'offers.title': 'Running Offers & Discounts',
    'offers.subtitle': 'Current discounts across our feed catalogue, updated daily.',
  },
  hi: {
    'nav.home': 'होम',
    'nav.shop': 'फ़ीड स्टोर',
    'nav.quiz': 'AI राशन क्विज़',
    'nav.subscriptions': 'सदस्यता',
    'nav.services': 'सेवाएँ',
    'nav.offers': 'ऑफ़र',
    'header.signin': 'साइन इन / पंजीकरण',
    'hero.badge': 'अगली पीढ़ी का एग्रोफ़ीड प्रो',
    'hero.title': 'बेहतर पोषण, स्वस्थ पशुधन',
    'hero.subtitle':
      'वैज्ञानिक फ़ीड पेलेट, बायपास फैट प्रोटीन और चीलेटेड कैल्शियम — अधिक दूध उत्पादन के लिए।',
    'cta.shop': 'कैटल फ़ीड खरीदें',
    'cta.quiz': 'AI राशन कैलकुलेटर',
    'footer.categories': 'फ़ीड श्रेणियाँ',
    'footer.tools': 'स्मार्ट किसान टूल्स',
    'footer.store': 'केंद्रीय फ़ीड हब',
    'cart.add': 'कार्ट में डालें',
    'cart.view': 'कार्ट',
    'offers.title': 'चल रहे ऑफ़र और छूट',
    'offers.subtitle': 'हमारे पूरे कैटलॉग पर आज की छूट।',
  },
  mr: {
    'nav.home': 'मुख्यपृष्ठ',
    'nav.shop': 'फीड स्टोअर',
    'nav.quiz': 'AI रेशन क्विझ',
    'nav.subscriptions': 'सबस्क्रिप्शन',
    'nav.services': 'सेवा',
    'nav.offers': 'ऑफर',
    'header.signin': 'साइन इन / नोंदणी',
    'hero.badge': 'पुढील पिढीचे अॅग्रोफीड प्रो',
    'hero.title': 'चांगले पोषण, निरोगी जनावरे',
    'hero.subtitle':
      'वैज्ञानिक फीड पेलेट्स, बायपास फॅट प्रोटीन आणि चिलेटेड कॅल्शियम — अधिक दुधाच्या उत्पादनासाठी.',
    'cta.shop': 'कॅटल फीड खरेदी करा',
    'cta.quiz': 'AI रेशन कॅल्क्युलेटर',
    'footer.categories': 'फीड प्रकार',
    'footer.tools': 'स्मार्ट शेतकरी साधने',
    'footer.store': 'केंद्रीय फीड हब',
    'cart.add': 'कार्टमध्ये टाका',
    'cart.view': 'कार्ट',
    'offers.title': 'सध्याचे ऑफर व सूट',
    'offers.subtitle': 'आमच्या संपूर्ण कॅटलॉगावरील आजच्या सूट.',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('pashufeed_lang') : null;
    return stored === 'hi' || stored === 'mr' ? stored : 'en';
  });

  useEffect(() => {
    window.localStorage.setItem('pashufeed_lang', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => setLanguageState(lang);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: string) => STRINGS[language][key] ?? STRINGS.en[key] ?? key,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
