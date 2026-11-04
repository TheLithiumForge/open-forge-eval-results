import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Game } from "./game/Game.tsx";
import "./app.css";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("Missing application root.");
}

createRoot(root).render(
  <StrictMode>
    <Game />
  </StrictMode>,
);
