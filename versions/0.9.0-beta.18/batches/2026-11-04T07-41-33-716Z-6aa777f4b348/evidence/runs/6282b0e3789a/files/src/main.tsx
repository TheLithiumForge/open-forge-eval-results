import { createRoot } from 'react-dom/client';
import { Game } from './Game.tsx';

const container = document.getElementById('root');
if (container) createRoot(container).render(<Game />);
