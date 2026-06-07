import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  build: {
    // Produce separate CSS per chunk so critical CSS loads fast
    cssCodeSplit: true,
    // Raise warning limit — we're intentionally splitting now
    chunkSizeWarningLimit: 300,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // ── html5-qrcode ── big scanner lib, only needed on dashboard scan
          if (id.includes("html5-qrcode")) return "vendor-scanner";

          // ── qrcode.react ── QR generation (host lobby only)
          if (id.includes("qrcode.react") || id.includes("qrcode")) return "vendor-qrcode";

          // ── React Router ──
          if (id.includes("react-router")) return "vendor-router";

          // ── TanStack Query ──
          if (id.includes("@tanstack")) return "vendor-query";

          // ── React core (react + react-dom) ── largest stable chunk, cache forever
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor-react";
          }

          // Do not bundle Prism components into vendor-misc so they can be loaded dynamically
          if (id.includes("prismjs/components/")) return undefined;

          // Everything else in node_modules → a single shared vendor chunk
          if (id.includes("node_modules")) return "vendor-misc";
        },
      },
    },
  },
});
