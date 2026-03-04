import React, { createContext, useContext, useState, useCallback } from 'react';
import translations, { type Locale, type Currency, type TranslationKey, currencyLocales } from './translations';

const exchangeRates: Record<Currency, Record<Currency, number>> = {
  BRL: { BRL: 1, USD: 0.17, EUR: 0.16, CHF: 0.15 },
  USD: { BRL: 5.80, USD: 1, EUR: 0.92, CHF: 0.88 },
  EUR: { BRL: 6.30, EUR: 1, USD: 1.09, CHF: 0.96 },
  CHF: { BRL: 6.55, CHF: 1, USD: 1.14, EUR: 1.04 },
};

const dateLocales: Record<Locale, string> = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
};

interface I18nContextType {
  locale: Locale;
  currency: Currency;
  baseCurrency: Currency;
  t: TranslationKey;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (value: number) => string;
  formatDate: (dateStr: string) => string;
  convertValue: (value: number) => number;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>('pt');
  const [currency, setCurrency] = useState<Currency>('BRL');
  const baseCurrency: Currency = 'BRL';

  const t = translations[locale];

  const convertValue = useCallback((value: number) => {
    if (currency === baseCurrency) return value;
    const rate = exchangeRates[baseCurrency][currency];
    return value * rate;
  }, [currency, baseCurrency]);

  const formatCurrency = useCallback((value: number) => {
    const converted = convertValue(value);
    return new Intl.NumberFormat(currencyLocales[currency], {
      style: 'currency',
      currency: currency,
    }).format(converted);
  }, [currency, convertValue]);

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat(dateLocales[locale], {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, currency, baseCurrency, t, setLocale, setCurrency, formatCurrency, formatDate, convertValue }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
};
