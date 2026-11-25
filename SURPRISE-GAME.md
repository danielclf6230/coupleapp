# 甜蜜無敵獎門人

## Local preview before deployment

`frontend/.env.development.local` sets `REACT_APP_API_URL=http://localhost:5000` for `npm start` only. It is ignored by Git, and production builds keep using the production API configuration.

Open two PowerShell terminals:

```powershell
# Terminal 1
cd D:\react\coupleapp\backend
$env:PORT = '5000'
npm start
```

```powershell
# Terminal 2
cd D:\react\coupleapp\frontend
npm start
```

Open `http://localhost:3000` and log in as Daniel. The frontend calls the local backend, which uses `backend/.env` for database and image storage. Test progress is saved in that configured database. Use Daniel's reset control to replay. Changes to environment files require restarting the corresponding process.

## Editable content

- Final mission paragraphs: `frontend/src/components/surprise/gameConfig.js`, `FINAL_MISSION_RULES`.
- Quiz text and answers: the same file, `QUESTIONS`.
- Release date: `backend/surprise-game.js`, `RELEASE_AT` (currently **2027-01-29 00:00 Japan time**).
- Prizes and probabilities: the same file, `PRIZES`. Equal-sized slices: ¥20,000 × 1, ¥10,000 × 2, Donki × 3, 30-minute shopping × 3, one shop × 4, convenience stores × 4 (17 slices total). The server draws uniformly across those slices, so each prize's chance matches its visible slice count. Repeated prizes are spread around the wheel, and the legend shows slice counts without percentages.
- Puzzle images: `frontend/src/images/surprise/puzzle-1.png` and `puzzle-2.png`. Both use a centered square crop, shared by the reference image and all nine pieces.

## Operation

Deploy both backend and frontend. The authenticated `/api/surprise` route automatically creates `surprise_settings` and `surprise_progress` in the existing MySQL database. The database account needs CREATE TABLE access on first use. No new environment variables or packages are required.

The backend checks the release instant on every request; no scheduled process or open browser is required. Open pages poll every 20 seconds (3 seconds while the game is open), and refresh on window focus. Server time governs availability.

An authenticated user whose database name is `daniel` (case insensitive) immediately sees the glowing gift for testing. Open it and tap the gear in the top bar for **Daniel 專用控制台**, to manually release it to both users or reset Daniel's test progress. Manual release persists in MySQL and does not reset after a restart. The control includes a confirmation to prevent spoiling the surprise accidentally. Recharge approval controls have been removed.

Each user's progress and prize are independent. Daniel can reset his own test progress from the control panel without changing his partner's progress. Closing the game saves completed missions; reopening starts the current mission from its rules, with its local timer, questions, and puzzle positions reset. A pending recharge remains available and starts a fresh three-second unlock countdown when reopened. Completing a mission waits for the server to save it before showing congratulations.

Daniel also has a skip button on the rules and play screens for missions 1–4. It skips his current mission, clears any pending recharge, and opens the next mission's rules (or the wheel after mission 4). The server restricts `/skip-test` to the authenticated Daniel account and only advances the expected current mission. Other users have no skip control or access to this endpoint.

Mission 1 lasts 180 seconds on a 10-column, 18-row board, with pieces falling every 1100 milliseconds. A score strictly greater than 916 wins. Only clearing lines scores points: 100 / 260 / 450 / 700 for one / two / three / four lines. Moving, dropping and locking pieces do not score. Timeout offers three kisses to add 60 seconds while keeping the board and score, plus a separate five-kiss restart button. A blocked spawn immediately shows a loss message and a five-kiss restart button; time recharge cannot clear a lost board. No kiss duration is required. After choosing recharge, the UI enables Continue or Restart after three seconds; no Daniel approval is required. Restart resets the board, score and 180-second timer. Recharge is consumed once on the backend, and the three-second interaction delay is handled in the client.

Game pages fit their viewport using compact layouts and automatic scaling. The puzzle play screen instead keeps a large square board (up to 360px wide) and scrolls on short screens so the pieces remain easy to touch. Loose pieces are scattered across a tabletop with stable random positions and rotations of 5–15 degrees in either direction. Picking up a piece straightens it; dragging shows it at the board-cell size, highlights the drop target, and scrolls near the viewport edges. Wrong drops return the piece to its original position. The board uses fixed equal rows and columns, and placing pieces never resizes it. Both photos fill the square without stretching or letterboxing, using the same centered crop for the reference and pieces. Daniel's controls remain on their own page.

The final mission starts a new 30-minute timer on pressing Start. Completion before expiry unlocks the wheel; expiry offers a retry. Reloading restarts the current mission as requested. The wheel draws on the server and atomically stores one result, so closing during animation, refreshing, or duplicate spin requests cannot reroll a saved prize. This is a personal game: the client reports mission completion, rather than an anti-cheat system.

## Checks

Backend: `cd backend && npm test`.

Frontend: `cd frontend && npm test -- --watchAll=false`, then `npm run build`.
