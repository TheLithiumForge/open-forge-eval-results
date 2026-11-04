import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Game } from "./game/Game.tsx";
import "./main.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("The application root element is missing.");
}

createRoot(rootElement).render(
  <StrictMode>
    <Game />
  </StrictMode>,
);
