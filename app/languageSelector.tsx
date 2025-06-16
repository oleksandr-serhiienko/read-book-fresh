import React, { createContext, useState, useContext } from 'react';
import SupportedLanguages from '@/components/reverso/languages/entities/languages';

type LanguageCode = keyof typeof SupportedLanguages;

interface LanguageContextType {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  setSourceLanguage: (language: LanguageCode) => void;
  setTargetLanguage: (language: LanguageCode) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode>('GERMAN');
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>('ENGLISH');

  return (
    <LanguageContext.Provider value={{ sourceLanguage, targetLanguage, setSourceLanguage, setTargetLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};