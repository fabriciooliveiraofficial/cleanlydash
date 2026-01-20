// ARQUIVO: components/layout/language-switcher.tsx
'use client'

import React, { useEffect } from 'react'
import Script from 'next/script'
import { Languages } from 'lucide-react'

export function LanguageSwitcher() {
  useEffect(() => {
    // CSS para esconder o banner do Google Translate e tooltips
    const style = document.createElement('style')
    style.innerHTML = `
      .goog-te-banner-frame.skiptranslate, .goog-te-gadget-icon { display: none !important; }
      body { top: 0px !important; }
      .goog-te-gadget-simple {
        background-color: transparent !important;
        border: none !important;
        padding: 0 !important;
        font-size: 13px !important;
        font-family: inherit !important;
        cursor: pointer;
        display: flex;
        align-items: center;
      }
      .goog-te-menu-value {
        margin: 0 !important;
        color: #64748b !important; /* text-slate-500 */
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .goog-te-menu-value span { color: transparent !important; font-size: 0 !important; }
      .goog-te-menu-value span:first-child { 
        color: #475569 !important; 
        font-size: 13px !important; 
        font-weight: 500;
      }
      .goog-te-menu-value img { display: none !important; }
      .goog-tooltip { display: none !important; }
      .goog-tooltip:hover { display: none !important; }
      .goog-text-highlight { background-color: transparent !important; border: none !important; box-shadow: none !important; }
    `
    document.head.appendChild(style)
  }, [])

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors">
      <Languages size={16} className="text-slate-400" />
      <div id="google_translate_element"></div>
      
      <Script
        id="google-translate-init"
        strategy="afterInteractive"
      >
        {`
          function googleTranslateElementInit() {
            new google.translate.TranslateElement({
              pageLanguage: 'en',
              includedLanguages: 'en,pt,es',
              layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
              autoDisplay: false
            }, 'google_translate_element');
          }
        `}
      </Script>
      <Script
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
    </div>
  )
}
