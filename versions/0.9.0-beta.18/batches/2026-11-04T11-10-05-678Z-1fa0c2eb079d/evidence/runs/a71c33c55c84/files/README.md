# Neon Pairs

Neon Pairs is a memory game that runs offline from one HTML file and keeps local best moves for each board size.

You can repeat a deal with its board code, save progress as a snapshot or run timed actions through the replay command.

Status: implements product spec version 3.

## Install

Use the named test combination, Node 26.12.1, npm 11.20.0 and Playwright 1.64.1 with Chromium 156.0.8078.4. From this folder, install the locked tools:

```powershell
npm ci --cache .npm-cache
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $PWD '.playwright-browsers'
$env:TEMP = Join-Path $PWD '.browser-work'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force -Path $env:TEMP | Out-Null
npm exec --cache .npm-cache -- playwright install chromium
```

These settings keep the browser download and temporary files inside the project. Browser tests use fresh contexts. They stop their browser and local HTTP server when they finish.

## Play

Run `npm run build`, then open `dist/index.html` from disk. The game makes no network requests. To keep saved sizes and scores on a stable HTTP origin, run `npm run dev`. Stop it when you finish.

Use Grid size to choose a board. Reveal two cards with a click, tap, Enter or Space. Arrow keys move board focus. Other keys stay with the browser. Tab leaves the board. New Game gives another deal. Restart repeats the current deal.

Open Reproduce a game to load a board code or export progress. Loading an unfinished snapshot pauses it. Resume returns focus to the remembered card and continues the remaining mismatch interval. A completed snapshot loads as completed without Resume. Elapsed time stops at 359999999ms while play continues. The minutes and seconds display reaches 5999:59. Moves stop at 999999. Matching and victory continue at that count. Saved bests use the same move limit.

Enter Deal name before selecting Export snapshot to save a name with your progress. Loading that snapshot restores its name. Named snapshots use version 2; clearing the name exports unnamed version 1 progress. Loading version 1 clears any current name. Both versions accept JSON properties in any order and validate the complete snapshot before replacing the game. Names preserve surrounding spaces and support up to 40 UTF-16 code units without line breaks. New Game, Restart, size changes, successful board-code loads and reload clear the name. Names stay out of saved preferences.

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

Verification passed on Node 26.12.1, npm 11.20.0, Playwright 1.64.1 and Chromium 156.0.8078.4: the locked install, all compiler projects, 153 unit and static tests across 22 files, and all 86 browser journeys. The full browser command used the named-combination flag and rebuilt the game, face sheet and session harness from current source. Its checks include named and unnamed snapshot imports, timer boundaries, storage, keyboard accessibility, touch, zoom and offline HTML. Other versions have no test record here.

All changed files pass Prettier. The repository-wide `npm run format:check` reports 53 existing formatting failures in untouched files; those same failures were reproduced on their committed contents.

## Accessibility

Keyboard, card names, atomic turn feedback, reduced motion, touch scrolling and the equivalent zoom layout at 640x400 CSS pixels with device scale 2 have browser checks. The diagnostic face sheet draws all 128 faces at 44px.

Playwright checks Chromium's accessibility tree through a complete keyboard journey. It checks controls, card names, states, turn results, the final summary, Tab exit and New Game. The developer provides this tree evidence and the tool record. You confirm spoken output during acceptance with your screen reader.

Tree record: Chromium 156.0.8078.4 and Playwright 1.64.1. Screen reader: not run. Spoken journey: user acceptance.

Delivered projects from document setups keep the product specification in `docs/`.

Follow the requirements in docs/ for this project.
