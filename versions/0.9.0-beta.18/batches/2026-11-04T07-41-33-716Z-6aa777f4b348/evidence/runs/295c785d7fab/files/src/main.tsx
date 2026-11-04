import { createRoot } from 'react-dom/client';
import { Game } from './game/Game.tsx';
import './game/game.css';

const root = document.getElementById('root');
if (root) createRoot(root).render(<Game />);
