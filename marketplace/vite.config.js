import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const flask = { target: "http://127.0.0.1:5000", changeOrigin: true };

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": flask,
      // Lets relative image URLs returned by Flask (e.g. /uploads/...) load via the same origin.
      "/uploads": flask,
      "/static": flask,
    },
  },
});
