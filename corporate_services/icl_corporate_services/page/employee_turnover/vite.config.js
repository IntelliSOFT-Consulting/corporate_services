import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "../../../public/js"),
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, "components/index.tsx"),
      output: {
        format: "iife",
        entryFileNames: "employee_turnover.js",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "components"),
    },
  },
});
