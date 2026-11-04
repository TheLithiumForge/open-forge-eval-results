import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Game } from "./Game.tsx";
import "./styles.css";

const rootElement = document.getElementById("root");
if (rootElement === null) throw new Error("The game root is missing.");

createRoot(rootElement).render(
  <StrictMode>
    <Game />
  </StrictMode>
);
