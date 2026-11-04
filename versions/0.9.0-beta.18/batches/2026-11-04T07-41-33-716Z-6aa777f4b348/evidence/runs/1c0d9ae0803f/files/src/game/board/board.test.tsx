import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { activateCard, createGame } from "../state.ts";
import { Board } from "./Board.tsx";
import { describeFace } from "./face.ts";

function boardMarkup(game: ReturnType<typeof createGame>, dealId = 0): string {
  if (!game) throw new Error("fixed board code must be valid");
  return renderToStaticMarkup(
    <Board game={game} dealId={dealId} paused={false} onActivate={() => undefined} />,
  );
}

describe("memory board rendering", () => {
  it("uses native roving buttons and keeps every hidden identity out of the DOM", () => {
    const game = createGame("np1-4-1");
    const markup = boardMarkup(game);
    expect(markup.match(/<button/g)).toHaveLength(16);
    expect(markup).toContain('role="group" aria-label="4 by 4 card board"');
    expect(markup).toContain('tabindex="0" aria-label="Row 1, column 1, closed"');
    expect(markup.match(/tabindex="0"/g)).toHaveLength(1);
    expect(markup.match(/class="neon-board-back"/g)).toHaveLength(16);
    expect(markup).not.toContain("neon-board-face");
    expect(markup).not.toContain("data-face");
    expect(markup).not.toContain("cyan solid");
  });

  it("names a revealed card with its face and mounts inline SVG artwork", () => {
    const game = createGame("np1-4-1");
    if (!game) throw new Error("fixed board code must be valid");
    const firstFace = game.board.deck[0];
    if (firstFace === undefined) throw new Error("a four by four board has a first card");
    const markup = boardMarkup(activateCard(game, 0));
    expect(markup).toContain(`aria-label="Row 1, column 1, ${describeFace(firstFace).name}, revealed"`);
    expect(markup.match(/class="neon-board-face"/g)).toHaveLength(1);
    expect(markup).toContain('viewBox="0 0 100 100"');
    expect(markup).toContain('class="neon-board-card neon-board-card--revealed"');
  });

  it("keeps a matched pair visible, named, green-bordered and aria-disabled", () => {
    const game = createGame("np1-4-1");
    if (!game) throw new Error("fixed board code must be valid");
    const matched = activateCard(activateCard(game, 2), 6);
    const markup = boardMarkup(matched, 4);
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(2);
    expect(markup.match(/class="neon-board-face"/g)).toHaveLength(2);
    expect(markup.match(/class="neon-board-check"/g)).toHaveLength(2);
    expect(markup).toContain(", matched\"");
    expect(markup).not.toContain('class="neon-board-card neon-board-card--revealed"');
  });

  it("sets internal grid extents so large boards scroll as one complete grid", () => {
    const game = createGame("np1-16-1");
    const markup = boardMarkup(game);
    expect(markup).toContain("min-width:794px");
    expect(markup).toContain("max-width:1498px");
    expect(markup).toContain('grid-template-columns:repeat(16, minmax(44px, 88px))');
  });
});
