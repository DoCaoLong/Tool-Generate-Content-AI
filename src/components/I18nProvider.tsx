"use client";

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

export default function I18nProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Only initialize language from localStorage on client side
        const savedLanguage = localStorage.getItem('cwui_language');
        if (savedLanguage === 'en' || savedLanguage === 'vi') {
            i18n.changeLanguage(savedLanguage);
        }
    }, []);

    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
