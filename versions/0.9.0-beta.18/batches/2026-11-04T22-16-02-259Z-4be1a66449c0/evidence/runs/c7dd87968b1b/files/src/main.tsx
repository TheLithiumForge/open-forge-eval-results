import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './game/Game.tsx';
import './style.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing app root.');
createRoot(rootElement).render(<StrictMode><Game /></StrictMode>);
