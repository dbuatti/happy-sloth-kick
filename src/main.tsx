import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="rainbow-whimsy" storageKey="vite-ui-theme">
    <App />
  </ThemeProvider>
);