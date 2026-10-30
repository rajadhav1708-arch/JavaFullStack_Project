import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { en, type TranslationKey } from '../i18n/en';
import { hi } from '../i18n/hi';
import { mr } from '../i18n/mr';

/**
 * Multilingual layer: English, Hindi and Marathi. Dictionaries live in
 * ../i18n/{en,hi,mr}.ts. Missing keys fall back to English, then the key
 * itself. Interpolation uses {{name}} placeholders resolved via t(key, vars).
 * In dev builds a missing key logs a warning so gaps are visible early.
 */

export type Language = 'en' | 'hi' | 'mr';

type Dict = Record<string, string>;
type Vars = Record<string, string | number>;

const STRINGS: Record<Language, Dict> = {
  en: en as unknown as Dict,
  hi: hi as unknown as Dict,
  mr: mr as unknown as Dict,
};

/** Replace {{name}} placeholders with values from vars. */
function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : match
  );
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Vars) => string;
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

  const value = useMemo<LanguageContextType>(
    () => ({
      language,
      setLanguage,
      t: (key: TranslationKey, vars?: Vars): string => {
        const template = STRINGS[language][key] ?? STRINGS.en[key];
        if (template === undefined) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn(`[i18n] Missing translation key: "${key}"`);
          }
          return key;
        }
        if (import.meta.env.DEV && STRINGS[language][key] === undefined) {
          // eslint-disable-next-line no-console
          console.warn(`[i18n] Key "${key}" missing in "${language}", falling back to English.`);
        }
        return interpolate(template, vars);
      },
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

export type { TranslationKey, Vars };
