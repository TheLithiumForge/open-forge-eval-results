import { createRoot } from 'react-dom/client';
import { Game } from './game/Game.tsx';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');
createRoot(root).render(<Game />);
