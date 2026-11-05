# Neon Pairs

Neon Pairs is a memory game that runs offline from one HTML file and keeps local best moves for each board size.

You can repeat a deal with its board code, save progress as a snapshot or run timed actions through the replay command.

Status: implements product spec version 2.2.

## Install

Use the named test combination, Node 26.12.1, npm 11.20.0 and Playwright 1.64.1 with Chromium 156.0.8078.4. From this folder, install the locked tools:

```powershell
npm ci --cache .npm-cache
```

Chromium 156.0.8078.4 comes with the project's image, so browser tests need no download. Browser tests use fresh contexts. They stop their browser and local HTTP server when they finish.

## Play

Run `npm run build`, then open `dist/index.html` from disk. The game makes no network requests. To keep saved sizes and scores on a stable HTTP origin, run `npm run dev`. Stop it when you finish.

Use Grid size to choose a board. Reveal two cards with a click, tap, Enter or Space. Arrow keys move board focus. Other keys stay with the browser. Tab leaves the board. New Game gives another deal. Restart repeats the current deal.

Open Reproduce a game to load a board code or export progress. Loading an unfinished snapshot pauses it. Resume returns focus to the remembered card and continues the remaining mismatch interval. A completed snapshot loads as completed without Resume. Elapsed time stops at 359999999ms while play continues. The minutes and seconds display reaches 5999:59. Moves stop at 999999. Matching and victory continue at that count. Saved bests use the same move limit.

Tournament, beside New Game, starts a knockout for 4 or 8 named players sharing this device. It uses the current Grid size. Each match gives both players the same deal in separate turns. Start turn reveals the board; time starts with the first revealed card, as in regular play. Next turn and Next match advance the bracket. Fewer moves wins; tied moves use elapsed milliseconds, then the first player listed for an exact tie. Leave tournament returns to regular play early. The final screen names the champion and offers Back to game.

The Tournament screen keeps completed brackets in Past tournaments across reloads. Select a past tournament to see its players, moves, times and winners. Every tournament screen has a Tournament JSON box with Export tournament and Load tournament. Version 1 JSON includes setup, the selected tournament, active game progress and past tournaments. Loading merges finished history without duplicates and pauses an unfinished turn until Start turn. Invalid JSON leaves play unchanged. Tournament play keeps regular best scores separate. Storage restrictions still allow play and JSON backups; only finished tournaments save automatically.

## Replay

Run `npm run --silent replay -- PATH` with a version 1 replay JSON file. Valid input prints only its final version 1 snapshot JSON to stdout and exits 0. Invalid input prints nothing to stdout, writes a message to stderr and exits nonzero. The command's silent flag suppresses its npm banner so stdout stays JSON. Other npm commands keep their errors and warnings. Replay timestamps can reach the safe integer limit. Elapsed time uses the same cap as browser play.

## Check

Run the checks from this folder:

```powershell
npm run typecheck
npm test
$env:NEON_PAIRS_NAMED_COMBINATION = '1'
npm run test:e2e
npm run format:check
```

`npm test` runs the unit and static checks with Vitest 5.0.5. `test:e2e` type checks and builds current source before opening the new HTML. It also builds the face sheet and session harness as separate diagnostic entries. The game distribution contains no diagnostic entry.

The browser command writes the Node, npm, Playwright and Chromium versions it ran on to `test-results/browser-runtime.json`. With `NEON_PAIRS_NAMED_COMBINATION` set to `1`, it also fails unless they match the named combination. Use the flag for named-combination evidence. Other supported runtimes, such as Node 24.19, run without it.

The locked install, type check, Vitest unit tests, build from current source and Chromium journeys have passed on the named combination with the flag set. Other versions have no test record here.

## Accessibility

Keyboard, card names, atomic turn feedback, reduced motion, touch scrolling and the equivalent zoom layout at 640x400 CSS pixels with device scale 2 have browser checks. The diagnostic face sheet draws all 128 faces at 44px.

Playwright checks Chromium's accessibility tree through a complete keyboard journey. It checks controls, card names, states, turn results, the final summary, Tab exit and New Game. The developer provides this tree evidence and the tool record. You confirm spoken output during acceptance with your screen reader.

Tree record: Chromium 156.0.8078.4 and Playwright 1.64.1. Screen reader: not run. Spoken journey: user acceptance.

Delivered projects from document setups keep the product specification in `docs/`.
