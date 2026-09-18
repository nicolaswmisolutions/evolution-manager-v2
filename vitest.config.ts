// Configuração de teste separada do vite.config.ts de propósito.
//
// O vitest 2 traz o próprio Vite 5 nas suas dependências, e os tipos dele
// conflitam com o Vite 7 do projeto. Declarar `test` dentro do vite.config.ts
// quebraria o `tsc -b` do build. Aqui não quebra: este arquivo não entra em
// nenhum tsconfig, e o vitest o encontra sozinho.
import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      // Fuso fixo: um off-by-one de timezone desloca o gráfico inteiro em uma
      // hora sem nenhum sintoma visível, então os testes de data precisam ser
      // reprodutíveis em qualquer máquina.
      TZ: "America/Sao_Paulo",
    },
  },
})
