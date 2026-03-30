import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/contexts/AuthContext";
import { MaintenanceProvider } from "@/components/contexts/MaintenanceContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark">
      <AuthProvider>
        <MaintenanceProvider>
          <App />
        </MaintenanceProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
