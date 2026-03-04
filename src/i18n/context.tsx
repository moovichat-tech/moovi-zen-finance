import React, { createContext, useContext, useState, useCallback } from 'react';
import translations, { type Locale, type Currency, type TranslationKey, currencyLocales } from './translations';

type Translations = typeof translations['pt'];

interface I18nContextType {
  locale: Locale;
  currency: Currency;
  t: Translations;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (value: number) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>('pt');
  const [currency, setCurrency] = useState<Currency>('BRL');

  const t = translations[locale];

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat(currencyLocales[currency], {
      style: 'currency',
      currency: currency,
    }).format(value);
  }, [currency]);

  return (
    <I18nContext.Provider value={{ locale, currency, t, setLocale, setCurrency, formatCurrency }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
};
