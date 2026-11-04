import { createRoot } from "react-dom/client";
import { Game } from "./Game.js";

const root = document.getElementById("root");
if (root === null) throw new Error("Application root is missing.");
createRoot(root).render(<Game />);
