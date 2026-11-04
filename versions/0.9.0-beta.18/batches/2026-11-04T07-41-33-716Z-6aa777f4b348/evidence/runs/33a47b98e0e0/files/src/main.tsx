import { createRoot } from 'react-dom/client';
import { Game } from './game/Game.tsx';
import './global.css';

const rootElement = document.getElementById('root');
if (rootElement === null) throw new Error('Game root element is missing');

createRoot(rootElement).render(<Game />);
