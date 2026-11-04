import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './Game.tsx';

const rootElement = document.getElementById('root');
if (rootElement === null) throw new Error('The game root element is missing.');

createRoot(rootElement).render(
  <StrictMode>
    <Game />
  </StrictMode>,
);
