import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enUS from "./languages/en-US.json";
import esES from "./languages/es-ES.json";
import frFR from "./languages/fr-FR.json";
import ptBR from "./languages/pt-BR.json";

export const SUPPORTED_LANGUAGES = ["pt-BR", "en-US", "es-ES", "fr-FR"] as const;

i18n
  // Antes, quem abria pela primeira vez caía em inglês independente do
  // navegador, e precisava descobrir o seletor no cabeçalho. O detector lê a
  // escolha salva e, na falta dela, o idioma do navegador.
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "en-US": { translation: enUS },
      "pt-BR": { translation: ptBR },
      "es-ES": { translation: esES },
      "fr-FR": { translation: frFR },
    },
    supportedLngs: [...SUPPORTED_LANGUAGES],
    // Faz um navegador em "pt" ou "pt-PT" cair em "pt-BR" em vez de no
    // fallback inglês; sem isso só a combinação exata funcionaria.
    nonExplicitSupportedLngs: true,
    fallbackLng: "en-US",
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
