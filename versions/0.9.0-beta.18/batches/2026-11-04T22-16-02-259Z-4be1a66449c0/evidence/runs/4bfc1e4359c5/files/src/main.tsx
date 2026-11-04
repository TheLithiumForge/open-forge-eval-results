import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Game } from "./game/Game.tsx";
import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing application root.");

createRoot(rootElement).render(
  <StrictMode>
    <Game />
  </StrictMode>,
);
