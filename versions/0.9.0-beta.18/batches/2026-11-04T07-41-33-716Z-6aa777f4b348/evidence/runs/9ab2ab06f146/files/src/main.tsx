import { createRoot } from 'react-dom/client';
import { Game } from './Game.tsx';
import './styles.css';

const root = document.getElementById('root');
if (root) createRoot(root).render(<Game />);
