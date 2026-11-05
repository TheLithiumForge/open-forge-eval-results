import { useState } from 'react';
export function useNotice(): [string, (message: string) => void, number] {
  const [notice, setNotice] = useState({ text: '', id: 0 });
  return [
    notice.text,
    (text) => setNotice((previous) => ({ text, id: previous.id + 1 })),
    notice.id,
  ];
}
