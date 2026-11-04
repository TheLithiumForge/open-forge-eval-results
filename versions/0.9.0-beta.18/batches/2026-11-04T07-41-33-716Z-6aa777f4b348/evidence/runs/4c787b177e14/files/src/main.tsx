import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Game } from "./Game.tsx";
import "./styles.css";

const root = document.getElementById("root");
if (root !== null) createRoot(root).render(<StrictMode><Game /></StrictMode>);
