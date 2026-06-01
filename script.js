// script.js
const { useState, useEffect, useCallback, useRef } = React;

const TILE_COLORS = {
  0:    { bg: 'rgba(238,228,218,0.35)', color: 'transparent' },
  2:    { bg: '#eee4da', color: '#776e65' },
  4:    { bg: '#ede0c8', color: '#776e65' },
  8:    { bg: '#f2b179', color: '#f9f6f2' },
  16:   { bg: '#f59563', color: '#f9f6f2' },
  32:   { bg: '#f67c5f', color: '#f9f6f2' },
  64:   { bg: '#f65e3b', color: '#f9f6f2' },
  128:  { bg: '#edcf72', color: '#f9f6f2' },
  256:  { bg: '#edcc61', color: '#f9f6f2' },
  512:  { bg: '#edc850', color: '#f9f6f2' },
  1024: { bg: '#edc53f', color: '#f9f6f2' },
  2048: { bg: '#edc22e', color: '#f9f6f2' },
};

const EMPTY_GRID = () => Array(4).fill(null).map(() => Array(4).fill(0));
const cloneGrid  = g => g.map(r => [...r]);
const gridsEqual = (a, b) => a.every((row, i) => row.every((v, j) => v === b[i][j]));

const addRandomTile = (grid) => {
  const empty = [];
  grid.forEach((row, i) => row.forEach((v, j) => { if (!v) empty.push([i, j]); }));
  if (!empty.length) return grid;
  const next = cloneGrid(grid);
  const [i, j] = empty[Math.floor(Math.random() * empty.length)];
  next[i][j] = Math.random() < 0.9 ? 2 : 4;
  return next;
};

const slideAndMerge = (row) => {
  const tiles = row.filter(Boolean);
  let score = 0;
  const merged = [];
  let i = 0;
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const val = tiles[i] * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(tiles[i++]);
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged, score };
};

const applyMove = (grid, dir) => {
  const next = cloneGrid(grid);
  let totalScore = 0;

  const process = (row) => {
    const { row: r, score } = slideAndMerge(row);
    totalScore += score;
    return r;
  };

  if (dir === 'left') {
    for (let i = 0; i < 4; i++) next[i] = process(next[i]);
  } else if (dir === 'right') {
    for (let i = 0; i < 4; i++) next[i] = process([...next[i]].reverse()).reverse();
  } else if (dir === 'up') {
    for (let j = 0; j < 4; j++) {
      const col = process(next.map(r => r[j]));
      col.forEach((v, i) => { next[i][j] = v; });
    }
  } else {
    for (let j = 0; j < 4; j++) {
      const col = process(next.map(r => r[j]).reverse()).reverse();
      col.forEach((v, i) => { next[i][j] = v; });
    }
  }

  return { grid: next, score: totalScore };
};

const canMove  = g => g.some((row, i) => row.some((v, j) =>
  !v ||
  (j < 3 && v === g[i][j+1]) ||
  (i < 3 && v === g[i+1][j])
));
const hasWon   = g => g.some(r => r.includes(2048));

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
  .g-wrap {
    width: 100%;
  }

  .g-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .g-title {
    font-size: clamp(48px, 14vw, 72px);
    font-weight: 900;
    color: #776e65;
    line-height: 1;
  }

  .g-scores {
    display: flex;
    gap: 8px;
  }

  .g-score-box {
    background: #bbada0;
    border-radius: 6px;
    padding: 6px 14px;
    text-align: center;
    min-width: 64px;
  }

  .g-score-label {
    font-size: 10px;
    color: #eee4da;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 1px;
  }

  .g-score-val {
    font-size: clamp(16px, 5vw, 22px);
    font-weight: 700;
    color: #fff;
  }

  .g-controls {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
  }

  .g-btn {
    background: #8f7a66;
    color: #f9f6f2;
    border: none;
    border-radius: 4px;
    padding: 8px 18px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    touch-action: manipulation;
  }

  .g-btn:active { background: #7a6856; }

  /* ── Grid ── */
  .g-board {
    width: 100%;
    background: #bbada0;
    border-radius: 8px;
    padding: 8px;
    position: relative;
    /* square board */
    aspect-ratio: 1 / 1;
  }

  .g-bg-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    width: 100%;
    height: 100%;
  }

  .g-cell-bg {
    background: rgba(238,228,218,0.35);
    border-radius: 4px;
  }

  .g-tile-layer {
    position: absolute;
    inset: 8px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    pointer-events: none;
  }

  .g-tile {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-weight: 900;
    /* font scales with tile cell size */
    font-size: clamp(14px, 5vw, 36px);
    transition: background-color 0.08s ease;
    will-change: transform;
  }

  .g-tile[data-val="128"],
  .g-tile[data-val="256"],
  .g-tile[data-val="512"] { font-size: clamp(12px, 4vw, 28px); }

  .g-tile[data-val="1024"],
  .g-tile[data-val="2048"] { font-size: clamp(10px, 3.5vw, 22px); }

  .g-tile.appear  { animation: tileAppear  0.12s ease-out; }
  .g-tile.merged  { animation: tileMerge   0.18s ease-out; }

  @keyframes tileAppear {
    0%   { transform: scale(0); }
    80%  { transform: scale(1.08); }
    100% { transform: scale(1); }
  }
  @keyframes tileMerge {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.18); }
    100% { transform: scale(1); }
  }

  /* ── Overlay ── */
  .g-overlay {
    position: absolute;
    inset: 0;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    z-index: 10;
  }

  .g-overlay.gameover { background: rgba(238,228,218,0.75); }
  .g-overlay.won      { background: rgba(237,194,46,0.55);  }

  .g-overlay-title {
    font-size: clamp(28px, 9vw, 48px);
    font-weight: 900;
    color: #776e65;
  }

  .g-overlay-sub {
    font-size: 15px;
    color: #776e65;
    font-weight: 700;
  }

  .g-overlay-btns {
    display: flex;
    gap: 8px;
  }

  .g-hint {
    text-align: center;
    color: #bbada0;
    font-size: 13px;
    margin-top: 10px;
  }
`;

// ── Tile ─────────────────────────────────────────────────────────────────────
const Tile = React.memo(({ value, state }) => {
  const c = TILE_COLORS[value] || { bg: '#3c3a32', color: '#f9f6f2' };
  return (
    <div
      className={`g-tile${state ? ` ${state}` : ''}`}
      data-val={value}
      style={{
        backgroundColor: c.bg,
        color: c.color,
        visibility: value ? 'visible' : 'hidden',
      }}
    >
      {value || ''}
    </div>
  );
});

// ── Game ─────────────────────────────────────────────────────────────────────
const Game2048 = () => {
  const init = () => addRandomTile(addRandomTile(EMPTY_GRID()));

  const [grid,   setGrid]   = useState(init);
  const [score,  setScore]  = useState(0);
  const [best,   setBest]   = useState(() => +localStorage.getItem('best2048') || 0);
  const [status, setStatus] = useState('playing');
  const [wonKept, setWonKept] = useState(false);
  const [tileStates, setTileStates] = useState({});

  const busy = useRef(false);

  useEffect(() => { localStorage.setItem('best2048', best); }, [best]);

  const move = useCallback((dir) => {
    if (busy.current) return;
    if (status === 'gameover') return;
    if (status === 'won' && !wonKept) return;

    busy.current = true;

    setGrid(prev => {
      const { grid: next, score: gained } = applyMove(prev, dir);
      if (gridsEqual(prev, next)) { busy.current = false; return prev; }

      // Compute tile animation states
      const states = {};
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          const key = `${i}-${j}`;
          if (next[i][j] && next[i][j] !== prev[i][j]) {
            // value changed → either new merge or new tile (handled separately)
            states[key] = next[i][j] > (prev[i][j] || 0) && prev[i][j] !== 0
              ? 'merged' : 'appear';
          }
        }
      setTileStates(states);

      const withTile = addRandomTile(next);

      if (gained) {
        setScore(s => {
          const ns = s + gained;
          setBest(b => Math.max(b, ns));
          return ns;
        });
      }

      if (!wonKept && hasWon(withTile)) setStatus('won');
      else if (!canMove(withTile))      setStatus('gameover');

      setTimeout(() => {
        busy.current = false;
        setTileStates({});
      }, 200);

      return withTile;
    });
  }, [status, wonKept]);

  // Keyboard
  useEffect(() => {
    const map = {
      ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
      w:'up', s:'down', a:'left', d:'right',
    };
    const onKey = e => { if (map[e.key]) { e.preventDefault(); move(map[e.key]); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  // Swipe
  useEffect(() => {
    let sx = 0, sy = 0;
    const onStart = e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    const onEnd   = e => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend',   onEnd,   { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend',   onEnd);
    };
  }, [move]);

  const restart = () => {
    setGrid(init());
    setScore(0);
    setStatus('playing');
    setWonKept(false);
    setTileStates({});
    busy.current = false;
  };

  return (
    <>
      <style>{css}</style>
      <div className="g-wrap">

        <div className="g-header">
          <div className="g-title">2048</div>
          <div className="g-scores">
            <div className="g-score-box">
              <div className="g-score-label">Score</div>
              <div className="g-score-val">{score}</div>
            </div>
            <div className="g-score-box">
              <div className="g-score-label">Best</div>
              <div className="g-score-val">{best}</div>
            </div>
          </div>
        </div>

        <div className="g-controls">
          <button className="g-btn" onClick={restart}>New Game</button>
        </div>

        <div className="g-board">
          {/* Background cells */}
          <div className="g-bg-grid">
            {Array(16).fill(null).map((_, k) => <div key={k} className="g-cell-bg" />)}
          </div>

          {/* Tile layer */}
          <div className="g-tile-layer">
            {grid.map((row, i) => row.map((val, j) => (
              <Tile
                key={`${i}-${j}`}
                value={val}
                state={tileStates[`${i}-${j}`]}
              />
            )))}
          </div>

          {status === 'gameover' && (
            <div className="g-overlay gameover">
              <div className="g-overlay-title">Game Over</div>
              <div className="g-overlay-sub">Score: {score}</div>
              <button className="g-btn" onClick={restart}>Try Again</button>
            </div>
          )}

          {status === 'won' && (
            <div className="g-overlay won">
              <div className="g-overlay-title">You Win!</div>
              <div className="g-overlay-sub">Score: {score}</div>
              <div className="g-overlay-btns">
                <button className="g-btn" onClick={() => { setStatus('playing'); setWonKept(true); }}>
                  Keep Going
                </button>
                <button className="g-btn" onClick={restart}>New Game</button>
              </div>
            </div>
          )}
        </div>

        <div className="g-hint">Arrow keys / WASD · Swipe on mobile</div>
      </div>
    </>
  );
};

ReactDOM.render(
  <React.StrictMode><Game2048 /></React.StrictMode>,
  document.getElementById('root')
);
