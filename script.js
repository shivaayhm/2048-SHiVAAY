const { useState, useEffect, useCallback, useRef } = React;

const TILE_COLORS = {
  0: { bg: '#cdc1b4', color: 'transparent' },
  2: { bg: '#eee4da', color: '#776e65' },
  4: { bg: '#ede0c8', color: '#776e65' },
  8: { bg: '#f2b179', color: '#f9f6f2' },
  16: { bg: '#f59563', color: '#f9f6f2' },
  32: { bg: '#f67c5f', color: '#f9f6f2' },
  64: { bg: '#f65e3b', color: '#f9f6f2' },
  128: { bg: '#edcf72', color: '#f9f6f2' },
  256: { bg: '#edcc61', color: '#f9f6f2' },
  512: { bg: '#edc850', color: '#f9f6f2' },
  1024: { bg: '#edc53f', color: '#f9f6f2' },
  2048: { bg: '#edc22e', color: '#f9f6f2' },
};

const EMPTY_GRID = () => Array(4).fill(null).map(() => Array(4).fill(0));

const cloneGrid = (g) => g.map(r => [...r]);

const gridsEqual = (a, b) => a.every((row, i) => row.every((v, j) => v === b[i][j]));

const addRandomTile = (grid) => {
  const empty = [];
  grid.forEach((row, i) => row.forEach((v, j) => { if (v === 0) empty.push([i, j]); }));
  if (!empty.length) return grid;
  const next = cloneGrid(grid);
  const [i, j] = empty[Math.floor(Math.random() * empty.length)];
  next[i][j] = Math.random() < 0.9 ? 2 : 4;
  return next;
};

const slideAndMergeRow = (row) => {
  const tiles = row.filter(v => v !== 0);
  const merged = [];
  let score = 0;
  let i = 0;
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const val = tiles[i] * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(tiles[i]);
      i++;
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged, score };
};

const applyMove = (grid, direction) => {
  const next = cloneGrid(grid);
  let totalScore = 0;

  const processRow = (row) => {
    const { row: merged, score } = slideAndMergeRow(row);
    totalScore += score;
    return merged;
  };

  if (direction === 'left') {
    for (let i = 0; i < 4; i++) {
      next[i] = processRow(next[i]);
    }
  } else if (direction === 'right') {
    for (let i = 0; i < 4; i++) {
      next[i] = processRow([...next[i]].reverse()).reverse();
    }
  } else if (direction === 'up') {
    for (let j = 0; j < 4; j++) {
      const col = next.map(r => r[j]);
      const { row: merged, score } = slideAndMergeRow(col);
      totalScore += score;
      merged.forEach((v, i) => { next[i][j] = v; });
    }
  } else if (direction === 'down') {
    for (let j = 0; j < 4; j++) {
      const col = next.map(r => r[j]).reverse();
      const { row: merged, score } = slideAndMergeRow(col);
      totalScore += score;
      merged.reverse().forEach((v, i) => { next[i][j] = v; });
    }
  }

  return { grid: next, score: totalScore };
};

const canMove = (grid) => {
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      if (grid[i][j] === 0) return true;
      if (j < 3 && grid[i][j] === grid[i][j + 1]) return true;
      if (i < 3 && grid[i][j] === grid[i + 1][j]) return true;
    }
  return false;
};

const hasWon = (grid) => grid.some(row => row.some(v => v === 2048));

// --- Styles ---
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Clear+Sans:wght@400;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #faf8ef;
    font-family: 'Clear Sans', Arial, sans-serif;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    padding: 20px;
  }

  .app { width: 500px; }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .title {
    font-size: 72px;
    font-weight: 700;
    color: #776e65;
    line-height: 1;
  }

  .scores {
    display: flex;
    gap: 8px;
  }

  .score-box {
    background: #bbada0;
    border-radius: 6px;
    padding: 8px 16px;
    text-align: center;
    min-width: 80px;
  }

  .score-label {
    font-size: 11px;
    color: #eee4da;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 1px;
  }

  .score-value {
    font-size: 22px;
    font-weight: 700;
    color: #fff;
  }

  .controls {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-bottom: 16px;
  }

  .btn {
    background: #8f7a66;
    color: #f9f6f2;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.1s;
  }

  .btn:hover { background: #9f8a76; }

  .grid-wrapper {
    background: #bbada0;
    border-radius: 8px;
    padding: 10px;
    position: relative;
  }

  .grid-bg {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .cell-bg {
    background: rgba(238,228,218,0.35);
    border-radius: 4px;
    aspect-ratio: 1;
  }

  .tiles-layer {
    position: absolute;
    top: 10px; left: 10px; right: 10px; bottom: 10px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    pointer-events: none;
  }

  .tile {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-weight: 700;
    aspect-ratio: 1;
    transition: background-color 0.1s ease;
    animation: tileAppear 0.15s ease-out;
    will-change: transform;
  }

  .tile.merged {
    animation: tileMerge 0.2s ease-out;
  }

  @keyframes tileAppear {
    0%   { transform: scale(0); opacity: 0; }
    80%  { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes tileMerge {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.2); }
    100% { transform: scale(1); }
  }

  .overlay {
    position: absolute;
    inset: 0;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
    font-weight: 700;
    gap: 16px;
  }

  .overlay.gameover { background: rgba(238,228,218,0.73); }
  .overlay.won      { background: rgba(237,194,46,0.5); }

  .overlay-title {
    font-size: 48px;
    color: #776e65;
  }

  .subtitle {
    text-align: center;
    color: #776e65;
    font-size: 15px;
    padding: 0 32px;
  }

  .swipe-hint {
    text-align: center;
    color: #bbada0;
    font-size: 13px;
    margin-top: 12px;
  }
`;

// --- Tile font size by value ---
const tileFont = (val) => {
  if (val >= 1024) return '24px';
  if (val >= 128) return '30px';
  return '36px';
};

// --- Tile component with merge animation tracking ---
const Tile = React.memo(({ value, merged }) => {
  const colors = TILE_COLORS[value] || { bg: '#3c3a32', color: '#f9f6f2' };
  return (
    <div
      className={`tile${merged ? ' merged' : ''}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.color,
        fontSize: tileFont(value),
        visibility: value === 0 ? 'hidden' : 'visible',
      }}
    >
      {value !== 0 ? value : ''}
    </div>
  );
});

// --- Main Game ---
const Game2048 = () => {
  const [grid, setGrid] = useState(() => addRandomTile(addRandomTile(EMPTY_GRID())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('2048-best') || '0'));
  const [status, setStatus] = useState('playing'); // 'playing' | 'won' | 'gameover'
  const [mergedCells, setMergedCells] = useState(new Set());
  const [wonContinued, setWonContinued] = useState(false);
  const processingRef = useRef(false);

  // Persist best score
  useEffect(() => {
    localStorage.setItem('2048-best', best);
  }, [best]);

  const move = useCallback((direction) => {
    if (processingRef.current) return;
    if (status === 'gameover') return;
    if (status === 'won' && !wonContinued) return;

    processingRef.current = true;

    setGrid(prev => {
      const { grid: next, score: gained } = applyMove(prev, direction);

      if (gridsEqual(prev, next)) {
        processingRef.current = false;
        return prev;
      }

      // Detect merged cells for animation
      const merged = new Set();
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          if (next[i][j] !== 0 && next[i][j] !== prev[i][j] && next[i][j] > 0)
            merged.add(`${i}-${j}`);
      setMergedCells(merged);

      const withTile = addRandomTile(next);

      if (gained > 0) {
        setScore(s => {
          const ns = s + gained;
          setBest(b => Math.max(b, ns));
          return ns;
        });
      }

      if (!wonContinued && hasWon(withTile)) {
        setStatus('won');
      } else if (!canMove(withTile)) {
        setStatus('gameover');
      }

      setTimeout(() => {
        processingRef.current = false;
        setMergedCells(new Set());
      }, 200);

      return withTile;
    });
  }, [status, wonContinued]);

  // Keyboard
  useEffect(() => {
    const handler = (e) => {
      const map = {
        ArrowUp: 'up', ArrowDown: 'down',
        ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
      };
      if (map[e.key]) {
        e.preventDefault();
        move(map[e.key]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [move]);

  // Touch / swipe
  useEffect(() => {
    let startX = 0, startY = 0;
    const onStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const abs = { x: Math.abs(dx), y: Math.abs(dy) };
      if (Math.max(abs.x, abs.y) < 20) return;
      if (abs.x > abs.y) move(dx > 0 ? 'right' : 'left');
      else move(dy > 0 ? 'down' : 'up');
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [move]);

  const restart = () => {
    setGrid(addRandomTile(addRandomTile(EMPTY_GRID())));
    setScore(0);
    setStatus('playing');
    setWonContinued(false);
    setMergedCells(new Set());
  };

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="header">
          <div className="title">2048</div>
          <div className="scores">
            <div className="score-box">
              <div className="score-label">Score</div>
              <div className="score-value">{score}</div>
            </div>
            <div className="score-box">
              <div className="score-label">Best</div>
              <div className="score-value">{best}</div>
            </div>
          </div>
        </div>

        <div className="controls">
          <button className="btn" onClick={restart}>New Game</button>
        </div>

        <div className="grid-wrapper">
          {/* Background cells */}
          <div className="grid-bg">
            {Array(16).fill(null).map((_, i) => <div key={i} className="cell-bg" />)}
          </div>

          {/* Tile layer */}
          <div className="tiles-layer">
            {grid.map((row, i) =>
              row.map((val, j) => (
                <Tile
                  key={`${i}-${j}`}
                  value={val}
                  merged={mergedCells.has(`${i}-${j}`)}
                />
              ))
            )}
          </div>

          {/* Overlays */}
          {status === 'gameover' && (
            <div className="overlay gameover">
              <div className="overlay-title">Game Over</div>
              <div className="subtitle">Final score: {score}</div>
              <button className="btn" onClick={restart}>Try Again</button>
            </div>
          )}
          {status === 'won' && (
            <div className="overlay won">
              <div className="overlay-title">You Win!</div>
              <div className="subtitle">Score: {score}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={() => { setStatus('playing'); setWonContinued(true); }}>
                  Keep Going
                </button>
                <button className="btn" onClick={restart}>New Game</button>
              </div>
            </div>
          )}
        </div>

        <div className="swipe-hint">Arrow keys / WASD · Swipe on mobile</div>
      </div>
    </>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Game2048 />
  </React.StrictMode>,
  document.getElementById('root')
);
