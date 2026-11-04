import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './Game.tsx';

const root = document.getElementById('root');
if (root === null) throw new Error('The game root is missing.');

createRoot(root).render(
  <StrictMode>
    <Game />
  </StrictMode>,
);
