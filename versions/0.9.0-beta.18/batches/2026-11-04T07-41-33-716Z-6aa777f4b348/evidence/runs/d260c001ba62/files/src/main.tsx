import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './game/Game.tsx';
import './global.css';

const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><Game /></StrictMode>);
