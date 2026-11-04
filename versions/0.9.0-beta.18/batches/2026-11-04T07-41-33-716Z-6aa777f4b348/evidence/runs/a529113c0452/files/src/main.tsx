import { createRoot } from 'react-dom/client';
import { Game } from './game/Game.tsx';
import './main.css';

const root = document.getElementById('root');
if (root === null) throw new Error('Missing game root.');

createRoot(root).render(<Game />);
