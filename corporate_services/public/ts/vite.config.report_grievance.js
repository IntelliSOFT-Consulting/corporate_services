import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "../js"),
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, "report_grievance.tsx"),
      output: {
        format: "iife",
        entryFileNames: "report_grievance.js",
      },
    },
  },
});
