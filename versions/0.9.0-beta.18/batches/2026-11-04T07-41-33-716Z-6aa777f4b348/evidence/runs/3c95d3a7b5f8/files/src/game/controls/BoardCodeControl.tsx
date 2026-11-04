import { useEffect, useState } from 'react';
import './BoardCodeControl.css';

export interface BoardCodeControlProps {
  boardCode: string;
  dealId: number;
  onLoad: (draft: string) => boolean;
}

export function BoardCodeControl({ boardCode, dealId, onLoad }: BoardCodeControlProps) {
  const [draft, setDraft] = useState(boardCode);
  useEffect(() => setDraft(boardCode), [boardCode, dealId]);
  return <div className="board-code-control">
    <label htmlFor="board-code">Board code</label>
    <div className="board-code-row">
      <input id="board-code" type="text" value={draft} maxLength={32} spellCheck={false}
        autoComplete="off" autoCapitalize="none" onChange={(event) => setDraft(event.currentTarget.value)} />
      <button type="button" onClick={() => onLoad(draft)}>Load board</button>
    </div>
  </div>;
}
