/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APPLE_TOUCH_ICON_FILE: string;
  readonly VITE_CONFERENCE_DATA_FILE: string;
  readonly VITE_OFFICIAL_SITE_URL: string;
  readonly VITE_PWA_ICON_192_FILE: string;
  readonly VITE_PWA_ICON_512_FILE: string;
  readonly VITE_SESSION_SLACK_FILE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
