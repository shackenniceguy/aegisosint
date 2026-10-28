import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../locales/en.json';
import ru from '../locales/ru.json';
import uz from '../locales/uz.json';

type Language = 'en' | 'ru' | 'uz';

const translations: Record<Language, any> = { en, ru, uz };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('aegis_lang') as Language;
    return saved && ['en', 'ru', 'uz'].includes(saved) ? saved : 'ru';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('aegis_lang', lang);
  };

  const t = (path: string): string => {
    const keys = path.split('.');
    let curr = translations[language];
    for (const k of keys) {
      if (curr && typeof curr === 'object' && k in curr) {
        curr = curr[k];
      } else {
        // Fallback to English
        let fallback = translations['en'];
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object' && fk in fallback) {
            fallback = fallback[fk];
          } else {
            return path;
          }
        }
        return typeof fallback === 'string' ? fallback : path;
      }
    }
    return typeof curr === 'string' ? curr : path;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};

