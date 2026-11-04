import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './game/Game';
import './style.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element.');
createRoot(root).render(<StrictMode><Game /></StrictMode>);
