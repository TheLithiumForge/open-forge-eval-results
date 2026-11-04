import { createRoot } from "react-dom/client";
import { Game } from "./game/Game.tsx";
import "./styles.css";

const mount = document.getElementById("root");
if (!mount) throw new Error("Game root element is missing");

createRoot(mount).render(<Game />);
