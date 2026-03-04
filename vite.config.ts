import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // GitHub Pages 配備先も .env に寄せ、manifest とアプリ配信パスを同じ定義から作る。
  const base = env.VITE_APP_BASE_PATH;

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [env.VITE_APPLE_TOUCH_ICON_FILE],
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
              src: env.VITE_PWA_ICON_192_FILE,
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: env.VITE_PWA_ICON_512_FILE,
              sizes: "512x512",
              type: "image/png",
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              // HTML もアプリ本体も同じ env を参照し、公開ファイル名の定義を一箇所に寄せる。
              // 公開 JSON は最新取得を優先しつつ、通信不安定時は直近キャッシュを返す。
              urlPattern: ({ url }) =>
                [env.VITE_CONFERENCE_DATA_FILE, env.VITE_SESSION_SLACK_FILE].some((path) =>
                  url.pathname.endsWith(`/${path}`),
                ),
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
  };
});
