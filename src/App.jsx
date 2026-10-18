import { useState, useEffect } from 'react';
// The solver (cubejs) is loaded by <script> tags in index.html, which create window.Cube.
// Importing it as an ES module breaks because the library uses a top-level `this`.
const Cube = window.Cube;

// ---------------------------------------------------------------------------
// CUBE ENGINE (pure functions, no React needed)
// Each face is 9 stickers, read row by row as seen from OUTSIDE that face.
// Layout: U on top, then L F R B in a row, D below F.
// ---------------------------------------------------------------------------
const FACES = ['U', 'R', 'F', 'D', 'L', 'B']; // order the solver library expects

const makeSolved = () => ({
  U: Array(9).fill('w'), // White  (Up)
  D: Array(9).fill('y'), // Yellow (Down)
  F: Array(9).fill('g'), // Green  (Front)
  B: Array(9).fill('b'), // Blue   (Back)
  L: Array(9).fill('o'), // Orange (Left)
  R: Array(9).fill('r'), // Red    (Right)
});

const cloneCube = (c) => ({
  U: [...c.U], D: [...c.D], F: [...c.F], B: [...c.B], L: [...c.L], R: [...c.R],
});

// Rotate a 9-sticker face clockwise
const rotateFaceClockwise = (f) => [
  f[6], f[3], f[0],
  f[7], f[4], f[1],
  f[8], f[5], f[2],
];

// Each line reads: "this position receives the colour from that position".
const turnFront = (c) => {
  const n = cloneCube(c); n.F = rotateFaceClockwise(c.F);
  const { U, D, L, R } = c;
  n.R[0] = U[6]; n.R[3] = U[7]; n.R[6] = U[8];
  n.D[0] = R[6]; n.D[1] = R[3]; n.D[2] = R[0];
  n.L[2] = D[0]; n.L[5] = D[1]; n.L[8] = D[2];
  n.U[6] = L[8]; n.U[7] = L[5]; n.U[8] = L[2];
  return n;
};

const turnUp = (c) => {
  const n = cloneCube(c); n.U = rotateFaceClockwise(c.U);
  const { F, R, B, L } = c;
  for (const i of [0, 1, 2]) { n.L[i] = F[i]; n.B[i] = L[i]; n.R[i] = B[i]; n.F[i] = R[i]; }
  return n;
};

const turnRight = (c) => {
  const n = cloneCube(c); n.R = rotateFaceClockwise(c.R);
  const { U, F, D, B } = c;
  n.B[0] = U[8]; n.B[3] = U[5]; n.B[6] = U[2]; // up -> back (back face is mirrored)
  n.D[8] = B[0]; n.D[5] = B[3]; n.D[2] = B[6]; // back -> down
  n.F[8] = D[8]; n.F[5] = D[5]; n.F[2] = D[2]; // down -> front
  n.U[8] = F[8]; n.U[5] = F[5]; n.U[2] = F[2]; // front -> up
  return n;
};

const turnLeft = (c) => {
  const n = cloneCube(c); n.L = rotateFaceClockwise(c.L);
  const { U, F, D, B } = c;
  n.F[0] = U[0]; n.F[3] = U[3]; n.F[6] = U[6]; // up -> front
  n.D[0] = F[0]; n.D[3] = F[3]; n.D[6] = F[6]; // front -> down
  n.B[8] = D[0]; n.B[5] = D[3]; n.B[2] = D[6]; // down -> back
  n.U[0] = B[8]; n.U[3] = B[5]; n.U[6] = B[2]; // back -> up
  return n;
};

const turnDown = (c) => {
  const n = cloneCube(c); n.D = rotateFaceClockwise(c.D);
  const { F, R, B, L } = c;
  for (const i of [6, 7, 8]) { n.R[i] = F[i]; n.B[i] = R[i]; n.L[i] = B[i]; n.F[i] = L[i]; }
  return n;
};

const turnBack = (c) => {
  const n = cloneCube(c); n.B = rotateFaceClockwise(c.B);
  const { U, R, D, L } = c;
  n.L[6] = U[0]; n.L[3] = U[1]; n.L[0] = U[2]; // up -> left
  n.D[6] = L[0]; n.D[7] = L[3]; n.D[8] = L[6]; // left -> down
  n.R[8] = D[6]; n.R[5] = D[7]; n.R[2] = D[8]; // down -> right
  n.U[2] = R[8]; n.U[1] = R[5]; n.U[0] = R[2]; // right -> up
  return n;
};

const TURNS = { F: turnFront, U: turnUp, R: turnRight, L: turnLeft, D: turnDown, B: turnBack };

// Accepts "R", "R'" (counter-clockwise) and "R2" (half turn)
const applyMove = (state, token) => {
  const turns = token[1] === "'" ? 3 : token[1] === '2' ? 2 : 1;
  let s = state;
  for (let i = 0; i < turns; i++) s = TURNS[token[0]](s);
  return s;
};

const invertMove = (t) => (t.length === 1 ? t + "'" : t[1] === "'" ? t[0] : t);

// The solver speaks face letters (U R F D L B), not colours.
// The centre sticker of each face tells us which colour belongs to which face.
const toFacelets = (c) => {
  const colourToFace = {};
  for (const f of FACES) colourToFace[c[f][4]] = f;
  if (Object.keys(colourToFace).length !== 6) return null;
  return FACES.map((f) => c[f].map((s) => colourToFace[s]).join('')).join('');
};

const countColours = (c) => {
  const counts = { w: 0, y: 0, g: 0, b: 0, o: 0, r: 0 };
  FACES.forEach((f) => c[f].forEach((s) => { counts[s] += 1; }));
  return counts;
};

const COLOUR_NAMES = { w: 'White', y: 'Yellow', g: 'Green', b: 'Blue', o: 'Orange', r: 'Red' };

const getFaceColor = (code) => {
  switch (code) {
    case 'w': return '#f8fafc';
    case 'y': return '#facc15';
    case 'g': return '#22c55e';
    case 'b': return '#3b82f6';
    case 'o': return '#f97316';
    case 'r': return '#ef4444';
    default: return '#cbd5e1';
  }
};

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const THEME = {
  pink: '#f0568c',
  pinkSoft: '#fde4ec',
  pinkLine: '#f9b4cb',
  navy: '#1e1b3a',
  grey: '#64748b',
  card: '#ffffff',
};

const SIMPLE_NAMES = { U: 'top', D: 'bottom', F: 'front', B: 'back', L: 'left', R: 'right' };
const FACE_LABELS = { U: 'Up (U)', D: 'Down (D)', F: 'Front (F)', B: 'Back (B)', L: 'Left (L)', R: 'Right (R)' };

// Everything the "Next move" card says about one move such as "R", "R'" or "R2".
const describeMove = (t) => {
  const face = t[0];
  const kind = t[1] === "'" ? 'ccw' : t[1] === '2' ? 'half' : 'cw';
  const label = FACE_LABELS[face];
  const simple = SIMPLE_NAMES[face];
  if (kind === 'ccw') {
    return {
      kind,
      title: `Turn the ${label} face counter-clockwise, one quarter turn (90°).`,
      note: `${t} means the ${simple} face, turned the opposite way (counter-clockwise), like the arrow shown here.`,
    };
  }
  if (kind === 'half') {
    return {
      kind,
      title: `Turn the ${label} face a half turn (180°).`,
      note: `${t} means the ${simple} face, turned twice. Either direction gives the same result.`,
    };
  }
  return {
    kind,
    title: `Turn the ${label} face clockwise, one quarter turn (90°).`,
    note: `${t} means the ${simple} face. Clockwise is like the arrow shown here.`,
  };
};

// ---------------------------------------------------------------------------
// 3D CUBE PICTURE (SVG). Draws the cube as it is right now, with the face that
// has to turn outlined in pink and an arrow showing the direction.
// Coordinates: x = right, y = up, z = towards you. Each face has a normal (n),
// a "right" direction (r) and a "down" direction (d), exactly as the 9 stickers
// are read when you look at that face from outside.
// ---------------------------------------------------------------------------
const FACE_GEOM = {
  F: { n: [0, 0, 1], r: [1, 0, 0], d: [0, -1, 0] },
  B: { n: [0, 0, -1], r: [-1, 0, 0], d: [0, -1, 0] },
  R: { n: [1, 0, 0], r: [0, 0, -1], d: [0, -1, 0] },
  L: { n: [-1, 0, 0], r: [0, 0, 1], d: [0, -1, 0] },
  U: { n: [0, 1, 0], r: [1, 0, 0], d: [0, 0, 1] },
  D: { n: [0, -1, 0], r: [1, 0, 0], d: [0, 0, -1] },
};

// Camera angle that makes the moving face visible (up/front/right is the default view)
const MOVE_VIEW = {
  U: { yaw: -35, pitch: 28 }, F: { yaw: -35, pitch: 28 }, R: { yaw: -35, pitch: 28 },
  L: { yaw: 35, pitch: 28 }, B: { yaw: 145, pitch: 28 }, D: { yaw: -35, pitch: -28 },
};

const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vmul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

const makeProjector = ({ yaw, pitch }) => {
  const th = (yaw * Math.PI) / 180;
  const ph = (pitch * Math.PI) / 180;
  const rot = ([x, y, z]) => {
    const x1 = x * Math.cos(th) + z * Math.sin(th);
    const z1 = -x * Math.sin(th) + z * Math.cos(th);
    return [x1, y * Math.cos(ph) - z1 * Math.sin(ph), y * Math.sin(ph) + z1 * Math.cos(ph)];
  };
  const SCALE = 58, CENTRE = 110;
  return {
    depth: (v) => rot(v)[2], // > 0 means the face points towards the viewer
    pt: (p) => { const [x, y] = rot(p); return [CENTRE + SCALE * x, CENTRE - SCALE * y]; },
  };
};

const toPoints = (pts) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

const arrowHead = (from, to) => {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, px = -uy, py = ux;
  const tip = [to[0] + ux * 7, to[1] + uy * 7];
  const a = [to[0] - ux * 3 + px * 7, to[1] - uy * 3 + py * 7];
  const b = [to[0] - ux * 3 - px * 7, to[1] - uy * 3 - py * 7];
  return toPoints([tip, a, b]);
};

const CubeView = ({ cube, move }) => {
  const face = move[0];
  const kind = move[1] === "'" ? 'ccw' : move[1] === '2' ? 'half' : 'cw';
  const proj = makeProjector(MOVE_VIEW[face]);
  const visible = FACES.filter((f) => proj.depth(FACE_GEOM[f].n) > 0.05);

  const { n, r, d } = FACE_GEOM[face];
  const arc = (t0, t1) => Array.from({ length: 29 }, (_, k) => {
    const t = ((t0 + ((t1 - t0) * k) / 28) * Math.PI) / 180; // 0 = top of the face, growing = clockwise
    return proj.pt(vadd(vmul(n, 1.03), vadd(vmul(d, -Math.cos(t) * 0.62), vmul(r, Math.sin(t) * 0.62))));
  });
  let arrowPts = kind === 'half' ? arc(-70, 250) : arc(-50, 200);
  if (kind === 'ccw') arrowPts = [...arrowPts].reverse();
  const last = arrowPts.length - 1;

  return (
    <svg viewBox="0 0 220 220" width="170" height="170" role="img" aria-label={`Cube showing the ${SIMPLE_NAMES[face]} face to turn`}>
      {visible.map((f) => {
        const g = FACE_GEOM[f];
        const corner = (a, b) => proj.pt(vadd(g.n, vadd(vmul(g.r, a), vmul(g.d, b))));
        return (
          <g key={f}>
            <polygon points={toPoints([corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)])} fill="#1e1b3a" stroke="#1e1b3a" strokeWidth="2" strokeLinejoin="round" />
            {cube[f].map((colour, i) => {
              const row = Math.floor(i / 3), col = i % 3;
              const cr = -1 + (2 * col + 1) / 3, cd = -1 + (2 * row + 1) / 3, h = 0.29;
              const pts = [[-h, -h], [h, -h], [h, h], [-h, h]].map(([a, b]) => corner(cr + a, cd + b));
              return <polygon key={i} points={toPoints(pts)} fill={getFaceColor(colour)} stroke="#1e1b3a" strokeWidth="0.8" strokeLinejoin="round" />;
            })}
          </g>
        );
      })}

      {/* outline of the face that turns */}
      <polygon
        points={toPoints([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => proj.pt(vadd(n, vadd(vmul(r, a), vmul(d, b))))))}
        fill="none" stroke={THEME.pink} strokeWidth="4" strokeLinejoin="round"
      />

      {/* arrow: white halo first so it stays readable on every sticker colour */}
      <polyline points={toPoints(arrowPts)} fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={toPoints(arrowPts)} fill="none" stroke={THEME.pink} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={arrowHead(arrowPts[last - 1], arrowPts[last])} fill={THEME.pink} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      {kind === 'half' && (
        <polygon points={arrowHead(arrowPts[1], arrowPts[0])} fill={THEME.pink} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      )}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// UI pieces
// ---------------------------------------------------------------------------
const FaceGrid = ({ cube, faceName, label, onStickerClick }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <span style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '3px', color: THEME.grey }}>{label}</span>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 36px)', gap: '2px', backgroundColor: THEME.navy, padding: '3px', borderRadius: '6px' }}>
      {cube[faceName].map((sticker, index) => {
        const isCentre = index === 4; // centres never move, so they are locked
        return (
          <div
            key={index}
            onClick={() => !isCentre && onStickerClick(faceName, index)}
            style={{
              width: '36px', height: '36px', backgroundColor: getFaceColor(sticker), borderRadius: '3px',
              cursor: isCentre ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 'bold', color: sticker === 'w' || sticker === 'y' ? '#000' : '#fff',
              userSelect: 'none', outline: isCentre ? `2px solid ${THEME.navy}` : 'none', outlineOffset: '-4px',
            }}
          >
            {sticker}
          </div>
        );
      })}
    </div>
  </div>
);

const SectionTitle = ({ number, title, subtitle }) => (
  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '1rem', textAlign: 'left' }}>
    <div style={{ flex: '0 0 auto', width: 40, height: 40, borderRadius: '50%', backgroundColor: THEME.pink, color: '#fff', border: `4px solid ${THEME.pinkLine}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18 }}>
      {number}
    </div>
    <div>
      <div style={{ fontSize: '22px', fontWeight: 'bold', color: THEME.navy }}>{title}</div>
      {subtitle && <div style={{ fontSize: '14px', color: THEME.grey, marginTop: 2 }}>{subtitle}</div>}
    </div>
  </div>
);

const cardStyle = {
  maxWidth: '760px', margin: '0 auto 1.25rem', backgroundColor: THEME.card, borderRadius: '20px',
  padding: '1.5rem', boxShadow: '0 4px 20px rgba(240, 86, 140, 0.10)', border: '1px solid #fbe3ec',
};

const pinkButton = (enabled = true) => ({
  padding: '12px 28px', border: 'none', borderRadius: '999px', fontWeight: 'bold', fontSize: '16px', color: '#fff',
  background: enabled ? 'linear-gradient(90deg, #f472a0, #f0568c)' : '#f3c9d7',
  cursor: enabled ? 'pointer' : 'not-allowed', boxShadow: enabled ? '0 4px 12px rgba(240, 86, 140, 0.35)' : 'none',
});

const ghostButton = (enabled = true) => ({
  padding: '10px 18px', borderRadius: '999px', fontWeight: 'bold', fontSize: '14px', backgroundColor: '#fff',
  color: enabled ? THEME.pink : '#f3c9d7', border: `1.5px solid ${enabled ? THEME.pinkLine : '#fbe3ec'}`,
  cursor: enabled ? 'pointer' : 'not-allowed',
});

export default function App() {
  const [cube, setCube] = useState(makeSolved);
  const [solutionSteps, setSolutionSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [solverReady, setSolverReady] = useState(false);
  const [message, setMessage] = useState('');

  // The solver builds its lookup tables once. It takes a few seconds and blocks
  // the page while it works, so let the first render paint before starting it.
  useEffect(() => {
    const t = setTimeout(() => { Cube.initSolver(); setSolverReady(true); }, 50);
    return () => clearTimeout(t);
  }, []);

  // Any manual change invalidates a solution that was already computed.
  const clearSolution = () => { setSolutionSteps([]); setCurrentStepIndex(0); setMessage(''); };

  const handleStickerClick = (faceName, index) => {
    const colourOrder = ['w', 'g', 'r', 'b', 'o', 'y'];
    const faceArray = [...cube[faceName]];
    faceArray[index] = colourOrder[(colourOrder.indexOf(faceArray[index]) + 1) % colourOrder.length];
    setCube((prev) => ({ ...prev, [faceName]: faceArray }));
    clearSolution();
  };

  const handleManualTurn = (move) => { setCube((prev) => applyMove(prev, move)); clearSolution(); };

  const handleScrambleCube = () => {
    let s = makeSolved();
    for (let i = 0; i < 20; i++) s = TURNS[FACES[Math.floor(Math.random() * 6)]](s);
    setCube(s);
    clearSolution();
  };

  const handleClear = () => { setCube(makeSolved()); clearSolution(); };

  const counts = countColours(cube);
  const badCounts = Object.keys(counts).filter((k) => counts[k] !== 9);

  const handleSolveCube = () => {
    if (!solverReady) { setMessage('Solver is still loading, try again in a moment.'); return; }
    if (badCounts.length > 0) {
      setMessage(`Each colour must appear exactly 9 times. Check: ${badCounts.map((k) => `${COLOUR_NAMES[k]} (${counts[k]})`).join(', ')}.`);
      return;
    }
    const facelets = toFacelets(cube);
    if (!facelets) { setMessage('Each face centre must be a different colour.'); return; }
    try {
      const solution = Cube.fromString(facelets).solve().trim();
      if (solution === '') { setMessage('Already solved!'); return; }
      setSolutionSteps(solution.split(/\s+/));
      setCurrentStepIndex(0);
      setMessage('');
    } catch (e) {
      setMessage("That colour layout isn't possible on a real cube. Check for a mis-painted sticker, or two stickers swapped.");
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < solutionSteps.length) {
      setCube((prev) => applyMove(prev, solutionSteps[currentStepIndex]));
      setCurrentStepIndex((i) => i + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCube((prev) => applyMove(prev, invertMove(solutionSteps[currentStepIndex - 1])));
      setCurrentStepIndex((i) => i - 1);
    }
  };

  // Go back to the first step by undoing every move done so far.
  const handleRestartSteps = () => {
    setCube((prev) => {
      let s = prev;
      for (let i = currentStepIndex - 1; i >= 0; i--) s = applyMove(s, invertMove(solutionSteps[i]));
      return s;
    });
    setCurrentStepIndex(0);
  };

  // Uses uniquely labelled stickers, so a broken move cannot hide behind identical colours.
  const runCubeTests = () => {
    console.clear();
    console.log("--- Rubik's Cube Function Tests ---");
    const labelled = {};
    FACES.forEach((f) => { labelled[f] = Array.from({ length: 9 }, (_, i) => f + i); });
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    FACES.forEach((m) => {
      let t = labelled;
      for (let i = 0; i < 4; i++) t = applyMove(t, m);
      const fourTurns = same(t, labelled);
      const inverse = same(applyMove(applyMove(labelled, m), invertMove(m)), labelled);
      const ok = fourTurns && inverse;
      (ok ? console.log : console.error)(`[${ok ? 'PASS' : 'FAIL'}] ${m}: 4 turns = identity: ${fourTurns}, move then inverse = identity: ${inverse}`);
    });
  };

  const faceProps = { cube, onStickerClick: handleStickerClick };
  const hasSolution = solutionSteps.length > 0;
  const finished = hasSolution && currentStepIndex === solutionSteps.length;
  const info = hasSolution && !finished ? describeMove(solutionSteps[currentStepIndex]) : null;

  return (
    <div style={{ padding: '1.5rem 1rem 3rem', fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif', textAlign: 'center', background: 'linear-gradient(180deg, #fff1f5 0%, #fdf6f8 100%)', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '34px', fontWeight: 800, color: THEME.navy, margin: '0 0 4px' }}>Cube Solver</h1>
      <p style={{ fontSize: '16px', color: THEME.grey, margin: '0 0 1.5rem' }}>Match → Solve → Done!</p>

      {/* STEP 1: paint the cube */}
      <div style={cardStyle}>
        <SectionTitle
          number="1"
          title="Match your cube"
          subtitle="Hold your cube with white on top and green facing you. Click a sticker to change its colour."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, max-content)', gridTemplateRows: 'repeat(3, max-content)', gap: '12px', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem', backgroundColor: '#fff7fa', borderRadius: 16, padding: '1rem' }}>
          <div style={{ gridColumn: '2' }}><FaceGrid {...faceProps} faceName="U" label="UP" /></div>
          <div style={{ gridRow: '2', gridColumn: '1' }}><FaceGrid {...faceProps} faceName="L" label="LEFT" /></div>
          <div style={{ gridRow: '2', gridColumn: '2' }}><FaceGrid {...faceProps} faceName="F" label="FRONT" /></div>
          <div style={{ gridRow: '2', gridColumn: '3' }}><FaceGrid {...faceProps} faceName="R" label="RIGHT" /></div>
          <div style={{ gridRow: '2', gridColumn: '4' }}><FaceGrid {...faceProps} faceName="B" label="BACK" /></div>
          <div style={{ gridRow: '3', gridColumn: '2' }}><FaceGrid {...faceProps} faceName="D" label="DOWN" /></div>
        </div>

        {/* every colour must be used exactly 9 times */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {Object.keys(counts).map((k) => (
            <span key={k} style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '999px', border: `1px solid ${counts[k] === 9 ? '#e5e7eb' : '#ef4444'}`, color: counts[k] === 9 ? THEME.grey : '#ef4444', backgroundColor: '#fff' }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: getFaceColor(k), border: '1px solid #94a3b8', marginRight: 5 }} />
              {counts[k]}/9
            </span>
          ))}
        </div>

        <div style={{ backgroundColor: THEME.pinkSoft, color: '#9d2a57', borderRadius: 12, padding: '10px 14px', fontSize: '13px', textAlign: 'left', marginBottom: '1rem' }}>
          Make sure the centre colour on your cube matches the colour on the screen. The centre never moves!
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleSolveCube} style={pinkButton(solverReady)}>{solverReady ? 'Solve my cube' : 'Loading solver...'}</button>
          <button onClick={handleScrambleCube} style={ghostButton()}>Scramble</button>
          <button onClick={handleClear} style={ghostButton()}>Clear cube</button>
        </div>

        {message && (
          <p style={{ maxWidth: '460px', margin: '1rem auto 0', fontSize: '13px', color: message === 'Already solved!' ? '#16a34a' : '#dc2626' }}>{message}</p>
        )}
      </div>

      {/* STEP 2: next move */}
      <div style={cardStyle}>
        <SectionTitle
          number="2"
          title="Next move"
          subtitle={hasSolution ? "Follow the steps below. We'll show you which move to do and what it looks like." : 'Press "Solve my cube" and your steps will appear here.'}
        />

        {hasSolution && (
          <>
            {finished ? (
              <div style={{ padding: '1.5rem', fontSize: '26px', fontWeight: 'bold', color: '#16a34a' }}>Your cube is solved! 🎉</div>
            ) : (
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'stretch' }}>
                <div style={{ flex: '2 1 340px', display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#fff7fa', borderRadius: 16, padding: '12px 16px', textAlign: 'left' }}>
                  <CubeView cube={cube} move={solutionSteps[currentStepIndex]} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '30px', color: THEME.pink, lineHeight: 1 }}>{info.kind === 'ccw' ? '↺' : info.kind === 'half' ? '↻↻' : '↻'}</div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: THEME.navy, marginTop: 6 }}>{info.title}</div>
                  </div>
                </div>

                <div style={{ flex: '1 1 200px', backgroundColor: '#fff7fa', borderRadius: 16, padding: '12px 16px', textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', color: THEME.grey, marginBottom: 8 }}>Move notation</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: '0 0 auto', minWidth: 56, height: 52, borderRadius: 12, backgroundColor: THEME.pinkSoft, color: THEME.navy, fontWeight: 800, fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px' }}>
                      {solutionSteps[currentStepIndex]}
                    </div>
                    <div style={{ fontSize: '12px', color: THEME.grey }}>{info.note}</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', marginTop: '1.25rem' }}>
              <button onClick={handlePrevStep} disabled={currentStepIndex === 0} style={ghostButton(currentStepIndex !== 0)}>Back</button>
              <button onClick={handleNextStep} disabled={finished} style={{ ...pinkButton(!finished), minWidth: 220 }}>Next Step →</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', flexWrap: 'wrap', gap: 10 }}>
              <button onClick={handleRestartSteps} style={ghostButton(currentStepIndex !== 0)} disabled={currentStepIndex === 0}>↺ Reset</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '13px', color: THEME.grey }}>
                  {finished ? 'Done!' : `Step ${currentStepIndex + 1} of ${solutionSteps.length}`}
                </span>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 260, justifyContent: 'flex-end' }}>
                  {solutionSteps.map((_, i) => (
                    <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: i === currentStepIndex ? THEME.pink : i < currentStepIndex ? THEME.pinkLine : '#e5e7eb' }} />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
        Developer tools:{' '}
        <button onClick={() => handleManualTurn('F')} style={{ border: 'none', background: 'none', color: THEME.grey, textDecoration: 'underline', cursor: 'pointer' }}>turn F</button>{' · '}
        <button onClick={() => handleManualTurn('U')} style={{ border: 'none', background: 'none', color: THEME.grey, textDecoration: 'underline', cursor: 'pointer' }}>turn U</button>{' · '}
        <button onClick={runCubeTests} style={{ border: 'none', background: 'none', color: THEME.grey, textDecoration: 'underline', cursor: 'pointer' }}>run move self-test (console)</button>
      </div>
    </div>
  );
}
