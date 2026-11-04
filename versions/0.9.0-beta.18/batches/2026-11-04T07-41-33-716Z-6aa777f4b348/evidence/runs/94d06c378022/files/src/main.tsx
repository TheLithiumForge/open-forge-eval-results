import { createRoot } from 'react-dom/client';
import { Game } from './Game.tsx';

const root = document.getElementById('root');
if (root === null) throw new Error('Missing game root');

createRoot(root).render(<Game />);
