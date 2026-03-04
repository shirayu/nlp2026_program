import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

const base = "/nlp2026_program/";

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "NLP2026 予定表 (非公式版)",
        short_name: "NLP 2026",
        description: "NLP 2026 の非公式プログラムウェブサイト",
        theme_color: "#4338ca",
        background_color: "#f9fafb",
        display: "standalone",
        lang: "ja",
        scope: base,
        start_url: base,
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // 公開 JSON は最新取得を優先しつつ、通信不安定時は直近キャッシュを返す。
            urlPattern: ({ url }) =>
              ["/data.json", "/slack.json"].some((path) => url.pathname.endsWith(path)),
            handler: "NetworkFirst",
            options: {
              cacheName: "conference-json",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 2,
                maxAgeSeconds: 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: "node",
  },
});
