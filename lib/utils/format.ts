import i18n from '../i18n';

export const formatCurrency = (amount: number) => {
    const locale = i18n.language === 'pt' ? 'pt-BR' : i18n.language === 'es' ? 'es-ES' : 'en-US';
    const currency = i18n.language === 'pt' ? 'BRL' : 'USD';

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

export const formatPercent = (value: number) => {
    const locale = i18n.language === 'pt' ? 'pt-BR' : i18n.language === 'es' ? 'es-ES' : 'en-US';
    return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
    }).format(value / 100);
};
