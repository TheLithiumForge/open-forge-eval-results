import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './game/Game.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('The game root is missing.');
createRoot(rootElement).render(<StrictMode><Game /></StrictMode>);
