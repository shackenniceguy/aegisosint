import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-cyber-card border border-cyber-border rounded-lg p-1">
      <Globe className="w-4 h-4 text-cyber-textMuted ml-1" />
      {(['ru', 'en', 'uz'] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={`px-2 py-0.5 text-xs font-semibold rounded uppercase transition-colors ${
            language === lang
              ? 'bg-cyber-accent text-black font-bold shadow-sm'
              : 'text-cyber-textMuted hover:text-cyber-textPrimary'
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
};

