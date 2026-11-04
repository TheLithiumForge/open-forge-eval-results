import { createRoot } from 'react-dom/client';
import { Game } from './Game.tsx';
import './style.css';
const root = document.getElementById('root');
if (!root) throw new Error('Missing root');
createRoot(root).render(<Game />);
