import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Production Content-Security-Policy as a <meta> tag (GitHub Pages can't set headers).
 * Dev is left alone so Vite's HMR keeps working.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // Leaflet and React set inline style attributes
  "img-src 'self' data: https://tile.openstreetmap.org",
  "connect-src 'self' https://tile.openstreetmap.org",
  "font-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

function securityHeaders(): Plugin {
  return {
    name: "bupc-csp",
    apply: "build",
    transformIndexHtml: (html) =>
      html.replace(
        "<meta charset=\"UTF-8\" />",
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`,
      ),
  };
}

/** Emits dist/sw.js with a precache list of this build's shell files and a content hash. */
function serviceWorker(): Plugin {
  return {
    name: "bupc-sw",
    apply: "build",
    generateBundle(_, bundle) {
      const built = Object.keys(bundle).filter((f) =>
        /\.(js|css|html)$/.test(f) || (/\.woff2$/.test(f) && /latin-wght/.test(f) && !/ext/.test(f)),
      );
      const pub = ["data/campus.json", "data/graph.json", "icon.svg", "manifest.webmanifest", "icons/icon-192.png", "theme-boot.js"];
      const files = ["./", ...[...built, ...pub].filter((f) => f !== "index.html").map((f) => `./${f}`)];
      const hash = createHash("sha256");
      for (const f of Object.keys(bundle).sort()) hash.update(f);
      for (const f of readdirSync("public/data")) hash.update(readFileSync(`public/data/${f}`));
      const source = readFileSync("sw/sw.js", "utf8")
        .replaceAll("__VERSION__", hash.digest("hex").slice(0, 12))
        .replaceAll("__PRECACHE__", JSON.stringify(files, null, 2));
      if (source.includes("__PRECACHE__") || source.includes("__VERSION__")) this.error("sw.js placeholders not replaced");
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

// Relative base so the build works on GitHub Pages project sites (/bupc-navi/) or any static host.
export default defineConfig({
  base: "./",
  plugins: [react(), securityHeaders(), serviceWorker()],
  build: { sourcemap: true, chunkSizeWarningLimit: 700 },
});
