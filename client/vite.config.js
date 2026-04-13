import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve:{
    alias:{
      "@" : path.resolve(__dirname, "src"),
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // Separate heavy dependencies into their own chunks
          if (id.includes("/recharts/")) {
            return "charts";
          }

          if (id.includes("/framer-motion/")) {
            return "motion";
          }

          if (id.includes("/socket.io-client/")) {
            return "realtime";
          }

          if (id.includes("/@mui/") || id.includes("/@emotion/")) {
            return "mui";
          }

          if (id.includes("/@radix-ui/")) {
            return "radix";
          }

          if (id.includes("/lucide-react/")) {
            return "icons";
          }
          
          if (id.includes("/sonner")) {
            return "toasts";
          }
          
          if (id.includes("/date-fns/")) {
            return "dates";
          }

          if (id.includes("/react-router")) {
            return "router";
          }

          return "vendor";
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
    ],
    exclude: ['sonner'],
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
})