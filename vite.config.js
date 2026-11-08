import { defineConfig } from "vite";

// three.js is bundled on purpose: the apps run fully offline from local files.
export default defineConfig({ build: { chunkSizeWarningLimit: 800 } });
