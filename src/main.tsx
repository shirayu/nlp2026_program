import { registerSW } from "virtual:pwa-register";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { isImportPending } from "./lib/appDataExport";
import { ja } from "./locales/ja";

document.title = ja.documentTitle;

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  let reloading = false;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW(true);
    },
    onRegisteredSW(_swUrl, registration) {
      void registration?.update();
    },
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    if (window.location.hash.includes("import_settings=") || isImportPending()) return;
    reloading = true;
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
