
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/filter-drawer.css";
import "./styles/stars.css";
import { DarkModeProvider } from "./lib/DarkModeSystem";

createRoot(document.getElementById("root")!).render(
  <DarkModeProvider>
    <App />
  </DarkModeProvider>
);
  