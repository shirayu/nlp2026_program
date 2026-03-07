#!/usr/bin/env node

import { webcrypto } from "node:crypto";
import { pathToFileURL } from "node:url";

const IMPORT_ZOOM_FRAGMENT_PREFIX = "import_zoom_settings=";

function printHelp() {
  console.log(`Usage:
  node scripts/create-import-zoom-settings-url.mjs --base-url <url> [--a-url <url>] [--b-url <url>] [--c-url <url>] [--p-url <url>]

Options:
  --base-url  Base URL to attach hash fragment. Example: https://example.github.io/nlp2026/
  --a-url     Zoom custom URL for venue A (zoom.us or *.zoom.us, and path starts with /j/)
  --b-url     Zoom custom URL for venue B (zoom.us or *.zoom.us, and path starts with /j/)
  --c-url     Zoom custom URL for venue C (zoom.us or *.zoom.us, and path starts with /j/)
  --p-url     Zoom custom URL for venue P (zoom.us or *.zoom.us, and path starts with /j/)
  --help      Show this help
`);
}

export function parseArgs(argv) {
  const args = {
    baseUrl: "",
    aUrl: "",
    bUrl: "",
    cUrl: "",
    pUrl: "",
    help: false,
  };
  const optionToKey = {
    "--base-url": "baseUrl",
    "--a-url": "aUrl",
    "--b-url": "bUrl",
    "--c-url": "cUrl",
    "--p-url": "pUrl",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--") {
      continue;
    }
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }

    const optionKey = optionToKey[token];
    if (optionKey) {
      args[optionKey] = argv[i + 1] ?? "";
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

function canonicalizeVenueZoomUrls(venueZoomUrls) {
  return JSON.stringify({
    A: typeof venueZoomUrls.A === "string" ? venueZoomUrls.A.trim() : "",
    B: typeof venueZoomUrls.B === "string" ? venueZoomUrls.B.trim() : "",
    C: typeof venueZoomUrls.C === "string" ? venueZoomUrls.C.trim() : "",
    P: typeof venueZoomUrls.P === "string" ? venueZoomUrls.P.trim() : "",
  });
}

export async function buildZoomImportHash(venueZoomUrls) {
  const input = canonicalizeVenueZoomUrls(venueZoomUrls);
  const bytes = new TextEncoder().encode(input);
  const digest = await webcrypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildImportZoomSettingsUrl(args) {
  if (!args.baseUrl) {
    throw new Error("--base-url is required");
  }

  const venueZoomUrls = {};
  const aUrl = normalizeUrl(args.aUrl);
  const bUrl = normalizeUrl(args.bUrl);
  const cUrl = normalizeUrl(args.cUrl);
  const pUrl = normalizeUrl(args.pUrl);
  if (aUrl && !isAllowedZoomImportUrl(aUrl)) {
    throw new Error("--a-url must be a zoom.us or *.zoom.us URL with /j/ path");
  }
  if (bUrl && !isAllowedZoomImportUrl(bUrl)) {
    throw new Error("--b-url must be a zoom.us or *.zoom.us URL with /j/ path");
  }
  if (cUrl && !isAllowedZoomImportUrl(cUrl)) {
    throw new Error("--c-url must be a zoom.us or *.zoom.us URL with /j/ path");
  }
  if (pUrl && !isAllowedZoomImportUrl(pUrl)) {
    throw new Error("--p-url must be a zoom.us or *.zoom.us URL with /j/ path");
  }
  if (aUrl) venueZoomUrls.A = aUrl;
  if (bUrl) venueZoomUrls.B = bUrl;
  if (cUrl) venueZoomUrls.C = cUrl;
  if (pUrl) venueZoomUrls.P = pUrl;
  if (!("A" in venueZoomUrls) && !("B" in venueZoomUrls) && !("C" in venueZoomUrls) && !("P" in venueZoomUrls)) {
    throw new Error("At least one of --a-url, --b-url, --c-url or --p-url is required");
  }

  const payload = { venueZoomUrls };
  const hash = await buildZoomImportHash(venueZoomUrls);
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
