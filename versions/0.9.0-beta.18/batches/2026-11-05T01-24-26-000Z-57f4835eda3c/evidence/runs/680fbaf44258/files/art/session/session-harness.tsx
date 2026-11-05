import { createRoot } from 'react-dom/client';
import { App } from '../../src/game/App.tsx';

const element = document.getElementById('root');
if (!element) throw new Error('Missing session harness root.');
const host = document.createElement('div');
const unmount = document.createElement('button');
unmount.textContent = 'Unmount game';
element.append(unmount, host);
const root = createRoot(host);
root.render(<App />);
unmount.addEventListener('click', () => root.unmount());
