import { execSync } from "node:child_process";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";
import { CONFERENCE_JSON_NETWORK_TIMEOUT_SECONDS } from "./src/constants/network";

function resolveBlobVersion(repoPath: string, fallbackVersion: string): string {
  try {
    // HEAD 上の blob hash を使い、内容が同じなら URL を変えない。
    return execSync(`git rev-parse HEAD:${repoPath}`, {
      cwd: process.cwd(),
      encoding: "utf-8",
    }).trim();
  } catch {
    // git 情報が取れない環境ではビルド情報をバージョン値に使う。
    return fallbackVersion;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // GitHub Pages 配備先も .env に寄せ、manifest とアプリ配信パスを同じ定義から作る。
  const base = env.VITE_APP_BASE_PATH;
  const buildVersion = env.VITE_BUILD_DATE || env.VITE_BUILD_HASH || "";
  const joinBasePath = (basePath: string, filePath: string) => {
    const normalizedBasePath = basePath.endsWith("/") ? basePath : `${basePath}/`;
    const normalizedFilePath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
    return `${normalizedBasePath}${normalizedFilePath}`;
  };
  const conferenceDataPath = joinBasePath(base, env.VITE_CONFERENCE_DATA_FILE);
  const sessionSlackPath = joinBasePath(base, env.VITE_SESSION_SLACK_FILE);
  const conferenceDataFileRepoPath = `public/${env.VITE_CONFERENCE_DATA_FILE}`;
  const sessionSlackFileRepoPath = `public/${env.VITE_SESSION_SLACK_FILE}`;

  const dataVersion = resolveBlobVersion(conferenceDataFileRepoPath, buildVersion);
  const slackVersion = resolveBlobVersion(sessionSlackFileRepoPath, buildVersion);

  return {
    base,
    define: {
      "import.meta.env.VITE_DATA_VERSION": JSON.stringify(dataVersion),
      "import.meta.env.VITE_SLACK_VERSION": JSON.stringify(slackVersion),
    },
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
          // ビルド成果物と静的アセットだけを precache する。
          // data.json は更新頻度が高いため precache には含めず、
          // runtimeCaching で最新取得優先の NetworkFirst に寄せる。
          // slack.json は更新頻度が低いため precache に含め、オフライン再起動時の
          // 取得失敗率を下げる。
          globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
          additionalManifestEntries: [
            {
              url: sessionSlackPath,
              revision: slackVersion || buildVersion || null,
            },
          ],
          runtimeCaching: [
            {
              // 公開 data.json は毎回 fetch されるデータソースなので、SW 更新まで固定される
              // precache ではなく runtime cache に分離する。
              // handler は NetworkFirst を選び、オンライン時は変更されたタイムテーブルや
              // 情報をできるだけ早く反映し、オフライン時だけ直近キャッシュへフォールバックする。
              // 学会の数日前に一度アプリを開いたあと、会場や地下で長時間オフラインになっても
              // 表示できるよう、キャッシュ保持期間は 14 日にしている。
              // pathname は完全一致で判定し、意図しない別パスへの誤マッチを避ける。
              urlPattern: ({ url }) => url.pathname === conferenceDataPath,
              handler: "NetworkFirst",
              options: {
                cacheName: "conference-json",
                // 電波が弱い会場では長く待たず、一定秒でキャッシュ利用へ切り替える。
                networkTimeoutSeconds: CONFERENCE_JSON_NETWORK_TIMEOUT_SECONDS,
                expiration: {
                  // data.json のみを保持対象にする。
                  maxEntries: 1,
                  maxAgeSeconds: 60 * 60 * 24 * 14,
                },
                cacheableResponse: {
                  // 通常の 200 応答に加え、一部環境で返りうる opaque response も許可する。
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
