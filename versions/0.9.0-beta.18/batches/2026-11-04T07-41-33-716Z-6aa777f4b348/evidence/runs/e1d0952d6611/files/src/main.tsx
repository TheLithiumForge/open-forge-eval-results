import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './Game.tsx';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Game root element is missing.');

createRoot(container).render(
  <StrictMode>
    <Game />
  </StrictMode>,
);
