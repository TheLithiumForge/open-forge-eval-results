import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Game } from './game/Game.tsx'
import './game/Game.css'

const root = document.getElementById('root')

if (!root) throw new Error('Missing application root')

createRoot(root).render(
  <StrictMode>
    <Game />
  </StrictMode>,
)
