import './ResumeControl.css';

type Props = { focusBoard: () => void; onResume: () => void };
export function ResumeControl({ focusBoard, onResume }: Props) {
  return <div className="pause-bar"><p>Loaded snapshot. Select Resume to continue.</p>
    <button type="button" className="primary" onClick={() => {
      focusBoard();
      onResume();
    }}>Resume</button>
  </div>;
}
