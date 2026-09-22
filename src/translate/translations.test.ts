import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import enUS from "./languages/en-US.json";
import esES from "./languages/es-ES.json";
import frFR from "./languages/fr-FR.json";
import ptBR from "./languages/pt-BR.json";

/**
 * Estes testes existem porque os buracos de tradução não têm sintoma visível:
 * uma chave faltando cai no fallback e a tela continua "funcionando", só que
 * no idioma errado. Só um teste pega isso antes do usuário.
 */

type Dict = Record<string, unknown>;

const BUNDLES: Record<string, Dict> = {
  "pt-BR": ptBR,
  "en-US": enUS,
  "es-ES": esES,
  "fr-FR": frFR,
};

const flatten = (value: Dict, prefix = ""): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, inner] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      Object.assign(out, flatten(inner as Dict, path));
    } else {
      out[path] = String(inner);
    }
  }
  return out;
};

const flat = Object.fromEntries(Object.entries(BUNDLES).map(([lang, bundle]) => [lang, flatten(bundle)]));
const languages = Object.keys(BUNDLES);
const reference = "en-US";

describe("traduções", () => {
  it("todos os idiomas têm exatamente as mesmas chaves", () => {
    const expected = Object.keys(flat[reference]).sort();

    for (const lang of languages) {
      expect({ lang, keys: Object.keys(flat[lang]).sort() }).toEqual({ lang, keys: expected });
    }
  });

  it("nenhum valor está vazio", () => {
    for (const lang of languages) {
      const empty = Object.entries(flat[lang])
        .filter(([, value]) => value.trim() === "")
        .map(([key]) => key);
      expect({ lang, empty }).toEqual({ lang, empty: [] });
    }
  });

  it("os marcadores de interpolação batem com os do inglês", () => {
    // Um {{count}} perdido na tradução vira texto cru na tela.
    const placeholders = (value: string) => (value.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map((p) => p.replace(/\s/g, "")).sort();

    for (const lang of languages) {
      const mismatched = Object.keys(flat[reference])
        .filter((key) => flat[lang][key] !== undefined)
        .filter((key) => placeholders(flat[reference][key]).join() !== placeholders(flat[lang][key]).join())
        .map((key) => ({ key, en: placeholders(flat[reference][key]), got: placeholders(flat[lang][key]) }));

      expect({ lang, mismatched }).toEqual({ lang, mismatched: [] });
    }
  });
});

describe("uso do i18n no código", () => {
  const sourceFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : [];
    });

  it("nenhum t() usa defaultValue", () => {
    // defaultValue guarda o texto em pt-BR dentro do código: quando a chave
    // falta, um usuário francês recebe português em vez do fallback inglês,
    // e o buraco fica invisível.
    const offenders = sourceFiles("src")
      .filter((file) => !file.includes("translations.test"))
      .filter((file) => /defaultValue:/.test(readFileSync(file, "utf-8")));

    expect(offenders).toEqual([]);
  });
});
