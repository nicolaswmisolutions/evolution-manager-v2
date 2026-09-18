import "@evoapi/design-system/styles";
import "./index.css";
import "react-toastify/dist/ReactToastify.css";

import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import { ThemeProvider } from "./components/theme-provider.tsx";
import { installDemoAdapter } from "./lib/demo/adapter.ts";
import { queryClient } from "./lib/queries/react-query.ts";
import router from "./routes/index.tsx";
import i18n from "./translate/i18n";

// No-op fora do modo demo. Precisa rodar antes da primeira requisição.
installDemoAdapter();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>
    <ToastContainer theme="colored" />
  </React.StrictMode>,
);
