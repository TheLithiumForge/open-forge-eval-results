import { createRoot } from "react-dom/client";
import { Game } from "./game/Game";
import "./styles.css";

const root = document.getElementById("root");
if (root === null) throw new Error("Application root is missing.");
createRoot(root).render(<Game />);
