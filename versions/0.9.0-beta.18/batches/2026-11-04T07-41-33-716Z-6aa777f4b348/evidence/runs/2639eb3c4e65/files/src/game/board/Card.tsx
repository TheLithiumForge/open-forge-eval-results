import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Face } from './Face.tsx';
import { faceDescription } from './face.ts';
import './Card.css';

type CardProps = {
  position: string; face: number | undefined; matched: boolean; tabStop: boolean;
  activate: () => void; focus: () => void; navigate: (event: KeyboardEvent<HTMLButtonElement>) => void;
  setRef: (button: HTMLButtonElement | null) => void;
};

export function Card(props: CardProps) {
  const modifiedKey = useRef(false);
  const state = props.matched ? 'matched' : props.face === undefined ? 'closed' : 'revealed';
  const label = props.face === undefined ? `${props.position}, closed` :
    `${props.position}, ${faceDescription(props.face).name}, ${state}`;
  return <button type="button" className={`card ${state}`} ref={props.setRef} aria-label={label}
    tabIndex={props.tabStop ? 0 : -1} aria-disabled={props.matched ? 'true' : undefined}
    onFocus={event => {
      props.focus();
      event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }}
    onKeyDown={event => {
      modifiedKey.current = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
      props.navigate(event);
    }}
    onPointerDown={() => { modifiedKey.current = false; }}
    onClick={event => {
      if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey &&
          !(event.detail === 0 && modifiedKey.current)) props.activate();
    }}>
    {props.face === undefined ? <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="M50 38 62 50 50 62 38 50Z" fill="none" stroke="#757C9A" strokeWidth="3" />
    </svg> : <Face id={props.face} />}
    {props.matched && <span className="check" aria-hidden="true">✓</span>}
  </button>;
}
