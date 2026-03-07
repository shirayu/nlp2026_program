#!/usr/bin/env node

import { webcrypto } from "node:crypto";
import { pathToFileURL } from "node:url";

const IMPORT_ZOOM_FRAGMENT_PREFIX = "import_zoom_settings=";
const VENUE_KEYS = new Set(["A", "B", "C", "P"]);

function printHelp() {
  console.log(`Usage:
  node scripts/create-import-zoom-settings-url.mjs --base-url <url> [--venue <A=url>] [--session <id=url>] [--presentation <id=url>]

Options:
  --base-url      Base URL to attach hash fragment. Example: https://example.github.io/nlp2026/
  --venue         Venue custom URL. Repeatable. Example: --venue A=https://zoom.us/j/111
  --session       Session custom URL. Repeatable. Example: --session B1=https://zoom.us/j/222
  --presentation  Presentation custom URL. Repeatable. Example: --presentation B1-1=https://zoom.us/j/333
  --help          Show this help
`);
}

export function parseArgs(argv) {
  const args = {
    baseUrl: "",
    venues: [],
    sessions: [],
    presentations: [],
    help: false,
  };
  const repeatableOptionMap = {
    "--venue": "venues",
    "--session": "sessions",
    "--presentation": "presentations",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--") continue;
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--base-url") {
      args.baseUrl = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    const repeatableOptionKey = repeatableOptionMap[token];
    if (repeatableOptionKey) {
      args[repeatableOptionKey].push(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    throw new Error(`Unknown option: ${token}`);
  }

  return args;
}

function toBase64url(text) {
  return Buffer.from(text, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

function isAllowedZoomImportUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (host === "zoom.us" || host.endsWith(".zoom.us")) && url.pathname.startsWith("/j/");
  } catch {
    return false;
  }
}

function parseMapping(raw, label) {
  const eq = raw.indexOf("=");
  if (eq <= 0) {
    throw new Error(`${label} must be in <id=url> format`);
  }
  const key = raw.slice(0, eq).trim();
  const value = normalizeUrl(raw.slice(eq + 1));
  if (!key) throw new Error(`${label} id must not be empty`);
  if (!value) throw new Error(`${label} url must not be empty`);
  if (!isAllowedZoomImportUrl(value)) {
    throw new Error(`${label} must be a zoom.us or *.zoom.us URL with /j/ path`);
  }
  return { key, value };
}

function canonicalizeZoomCustomUrls(zoomCustomUrls) {
  const venues = {
    A: zoomCustomUrls?.venues?.A?.trim() ?? "",
    B: zoomCustomUrls?.venues?.B?.trim() ?? "",
    C: zoomCustomUrls?.venues?.C?.trim() ?? "",
    P: zoomCustomUrls?.venues?.P?.trim() ?? "",
  };
  const sessions = Object.fromEntries(
    Object.entries(zoomCustomUrls?.sessions ?? {})
      .map(([key, value]) => [key.trim(), value.trim()])
      .filter(([key, value]) => key.length > 0 && value.length > 0)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  const presentations = Object.fromEntries(
    Object.entries(zoomCustomUrls?.presentations ?? {})
      .map(([key, value]) => [key.trim(), value.trim()])
      .filter(([key, value]) => key.length > 0 && value.length > 0)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  return JSON.stringify({ venues, sessions, presentations });
}

export async function buildZoomImportHash(zoomCustomUrls) {
  const input = canonicalizeZoomCustomUrls(zoomCustomUrls);
  const bytes = new TextEncoder().encode(input);
  const digest = await webcrypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildImportZoomSettingsUrl(args) {
  if (!args.baseUrl) {
    throw new Error("--base-url is required");
  }

  const venues = {};
  const sessions = {};
  const presentations = {};

  for (const raw of args.venues) {
    const { key, value } = parseMapping(raw, "--venue");
    if (!VENUE_KEYS.has(key)) {
      throw new Error("--venue key must be one of A/B/C/P");
    }
    venues[key] = value;
  }
  for (const raw of args.sessions) {
    const { key, value } = parseMapping(raw, "--session");
    sessions[key] = value;
  }
  for (const raw of args.presentations) {
    const { key, value } = parseMapping(raw, "--presentation");
    presentations[key] = value;
  }

  if (
    Object.keys(venues).length === 0 &&
    Object.keys(sessions).length === 0 &&
    Object.keys(presentations).length === 0
  ) {
    throw new Error("At least one of --venue, --session or --presentation is required");
  }

  const zoomCustomUrls = {
    ...(Object.keys(venues).length > 0 ? { venues } : {}),
    ...(Object.keys(sessions).length > 0 ? { sessions } : {}),
    ...(Object.keys(presentations).length > 0 ? { presentations } : {}),
  };

  const payload = { zoomCustomUrls };
  const hash = await buildZoomImportHash(zoomCustomUrls);
  const encoded = toBase64url(JSON.stringify(payload));
  const url = new URL(args.baseUrl);
  url.hash = `${IMPORT_ZOOM_FRAGMENT_PREFIX}${encoded}`;
  return {
    hash,
    url: url.toString(),
  };
}

export async function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return;
  }

  const result = await buildImportZoomSettingsUrl(args);
  console.log(`ZOOM_IMPORT_HASH=${result.hash}`);
  console.log(result.url);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void run().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  });
}
