// Board describes itself with this paragraph through aria-describedby.
export function BoardHelp() {
  return (
    <p id="board-help" className="help">
      Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space reveals
      a card.
    </p>
  );
}
