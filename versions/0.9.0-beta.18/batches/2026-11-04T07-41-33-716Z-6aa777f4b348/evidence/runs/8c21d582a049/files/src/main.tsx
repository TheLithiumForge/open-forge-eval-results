import { createRoot } from 'react-dom/client';
import { Game } from './game/Game.tsx';
import './page.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing game root');
createRoot(root).render(<Game />);
