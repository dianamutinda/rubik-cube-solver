import { useState } from 'react';

export default function App() {
  const solvedState = {
    U: ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'], // White (Up)
    D: ['y', 'y', 'y', 'y', 'y', 'y', 'y', 'y', 'y'], // Yellow (Down)
    F: ['g', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'g'], // Green (Front)
    B: ['b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b'], // Blue (Back)
    L: ['o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o'], // Orange (Left)
    R: ['r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r']  // Red (Right)
  };

  const [cube, setCube] = useState(solvedState);
  const [solutionSteps, setSolutionSteps] = useState([]); 
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [scrambleHistory, setScrambleHistory] = useState([]);

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

  const handleStickerClick = (faceName, index) => {
    const faceArray = [...cube[faceName]];
    const colorOrder = ['w', 'g', 'r', 'b', 'o', 'y'];
    const currentIndex = colorOrder.indexOf(faceArray[index]);
    const nextColor = colorOrder[(currentIndex + 1) % colorOrder.length];
    
    faceArray[index] = nextColor;
    setCube(prev => ({ ...prev, [faceName]: faceArray }));
  };

  // Helper to rotate a 9-element face array clockwise
  const rotateFaceClockwise = (f) => [
    f[6], f[3], f[0],
    f[7], f[4], f[1],
    f[8], f[5], f[2]
  ];

  const turnFrontClockwise = (cubeState) => {
    const next = {
      U: [...cubeState.U], D: [...cubeState.D], F: rotateFaceClockwise(cubeState.F),
      B: [...cubeState.B], L: [...cubeState.L], R: [...cubeState.R],
    };
    const { U, D, L, R } = cubeState;
    // U bottom row [6, 7, 8] -> R left col [0, 3, 6]
    next.R[0] = U[6]; next.R[3] = U[7]; next.R[6] = U[8];
    // R left col [0, 3, 6] -> D top row [2, 1, 0] (reversed)
    next.D[0] = R[6]; next.D[1] = R[3]; next.D[2] = R[0];
    // D top row [0, 1, 2] -> L right col [8, 5, 2]
    next.L[2] = D[0]; next.L[5] = D[1]; next.L[8] = D[2];
    // L right col [2, 5, 8] -> U bottom row [6, 7, 8] (reversed)
    next.U[6] = L[8]; next.U[7] = L[5]; next.U[8] = L[2];
    return next;
  };

  const turnUpClockwise = (cubeState) => {
    const next = {
      U: rotateFaceClockwise(cubeState.U), D: [...cubeState.D], F: [...cubeState.F],
      B: [...cubeState.B], L: [...cubeState.L], R: [...cubeState.R],
    };
    const { F, R, B, L } = cubeState;
    next.F[0] = R[0]; next.F[1] = R[1]; next.F[2] = R[2];
    next.R[0] = B[0]; next.R[1] = B[1]; next.R[2] = B[2];
    next.B[0] = L[0]; next.B[1] = L[1]; next.B[2] = L[2];
    next.L[0] = F[0]; next.L[1] = F[1]; next.L[2] = F[2];
    return next;
  };

  const turnRightClockwise = (cubeState) => {
    const next = {
      U: [...cubeState.U], D: [...cubeState.D], F: [...cubeState.F],
      B: [...cubeState.B], L: [...cubeState.L], R: rotateFaceClockwise(cubeState.R),
    };
    const { U, F, D, B } = cubeState;
    next.F[2] = U[2]; next.F[5] = U[5]; next.F[8] = U[8];
    next.D[2] = F[2]; next.D[5] = F[5]; next.D[8] = F[8];
    next.B[0] = D[8]; next.B[3] = D[5]; next.B[6] = D[2]; // Back is mirrored
    next.U[2] = B[6]; next.U[5] = B[3]; next.U[8] = B[0];
    return next;
  };

  const turnLeftClockwise = (cubeState) => {
    const next = {
      U: [...cubeState.U], D: [...cubeState.D], F: [...cubeState.F],
      B: [...cubeState.B], L: rotateFaceClockwise(cubeState.L), R: [...cubeState.R],
    };
    const { U, B, D, F } = cubeState;
    next.B[2] = U[0]; next.B[5] = U[3]; next.B[8] = U[6];
    next.D[0] = B[8]; next.D[3] = B[5]; next.D[6] = B[2];
    next.F[0] = D[0]; next.F[3] = D[3]; next.F[6] = D[6];
    next.U[0] = F[6]; next.U[3] = F[3]; next.U[6] = F[0];
    return next;
  };

  const turnDownClockwise = (cubeState) => {
    const next = {
      U: [...cubeState.U], D: rotateFaceClockwise(cubeState.D), F: [...cubeState.F],
      B: [...cubeState.B], L: [...cubeState.L], R: [...cubeState.R],
    };
    const { F, L, B, R } = cubeState;
    next.L[6] = F[6]; next.L[7] = F[7]; next.L[8] = F[8];
    next.B[6] = L[6]; next.B[7] = L[7]; next.B[8] = L[8];
    next.R[6] = B[6]; next.R[7] = B[7]; next.R[8] = B[8];
    next.F[6] = R[6]; next.F[7] = R[7]; next.F[8] = R[8];
    return next;
  };

  const turnBackClockwise = (cubeState) => {
    const next = {
      U: [...cubeState.U], D: [...cubeState.D], F: [...cubeState.F],
      B: rotateFaceClockwise(cubeState.B), L: [...cubeState.L], R: [...cubeState.R],
    };
    const { U, R, D, L } = cubeState;
    next.R[2] = U[0]; next.R[5] = U[1]; next.R[8] = U[2];
    next.D[8] = R[2]; next.D[7] = R[5]; next.D[6] = R[8];
    next.L[0] = D[8]; next.L[3] = D[7]; next.L[6] = D[6];
    next.U[0] = L[6]; next.U[1] = L[3]; next.U[2] = L[0];
    return next;
  };

  const executeMove = (cubeState, move) => {
    switch (move) {
      case 'F': return turnFrontClockwise(cubeState);
      case 'U': return turnUpClockwise(cubeState);
      case 'R': return turnRightClockwise(cubeState);
      case 'L': return turnLeftClockwise(cubeState);
      case 'D': return turnDownClockwise(cubeState);
      case 'B': return turnBackClockwise(cubeState);
      default: return cubeState;
    }
  };

  const handleScrambleCube = () => {
    const possibleMoves = ['F', 'U', 'R', 'L', 'D', 'B'];
    let tempCube = { ...solvedState }; 
    const movesLog = [];

    for (let i = 0; i < 10; i++) {
      const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      movesLog.push(move);
      tempCube = executeMove(tempCube, move);
    }

    setCube(tempCube);
    setScrambleHistory(movesLog);
    setSolutionSteps([]); 
    setCurrentStepIndex(0);
  };

  const handleSolveCube = () => {
    if (scrambleHistory.length === 0) {
      alert("Please scramble the cube first!");
      return;
    }

    const inverseMoves = [];
    for (let i = scrambleHistory.length - 1; i >= 0; i--) {
      const move = scrambleHistory[i];
      inverseMoves.push(move, move, move);
    }

    setSolutionSteps(inverseMoves);
    setCurrentStepIndex(0);
  };

  const handleNextStep = () => {
    if (currentStepIndex < solutionSteps.length) {
      const move = solutionSteps[currentStepIndex];
      setCube(prevCube => executeMove(prevCube, move));
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const runCubeTests = () => {
    const faceTests = [
      { name: 'Front (F)', fn: turnFrontClockwise },
      { name: 'Up (U)', fn: turnUpClockwise },
      { name: 'Right (R)', fn: turnRightClockwise },
      { name: 'Left (L)', fn: turnLeftClockwise },
      { name: 'Down (D)', fn: turnDownClockwise },
      { name: 'Back (B)', fn: turnBackClockwise },
    ];

    console.clear();
    console.log("--- Starting Rubik's Cube Function Tests ---");

    faceTests.forEach(({ name, fn }) => {
      let testCube = {
        U: [...solvedState.U], D: [...solvedState.D], F: [...solvedState.F],
        B: [...solvedState.B], L: [...solvedState.L], R: [...solvedState.R],
      };

      for (let i = 0; i < 4; i++) {
        testCube = fn(testCube);
      }

      let isIdentical = true;
      Object.keys(solvedState).forEach(faceKey => {
        for (let j = 0; j < 9; j++) {
          if (testCube[faceKey][j] !== solvedState[faceKey][j]) {
            isIdentical = false;
          }
        }
      });

      if (isIdentical) {
        console.log(`%c[PASS] ${name} rotation returns to solved state.`, 'color: #22c55e; font-weight: bold;');
      } else {
        console.error(`[FAIL] ${name} rotation is broken! (Failed Rule of 4)`);
      }
    });
  };

  const FaceGrid = ({ faceName, label }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <span style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "3px", color: "#475569" }}>{label}</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 36px)", gap: "2px", backgroundColor: "#0f172a", padding: "3px", borderRadius: "4px" }}>
        {cube[faceName].map((sticker, index) => (
          <div 
            key={index} 
            onClick={() => handleStickerClick(faceName, index)}
            style={{ width: "36px", height: "36px", backgroundColor: getFaceColor(sticker), borderRadius: "2px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "bold", color: sticker === 'w' || sticker === 'y' ? '#000' : '#fff', userSelect: "none" }}
          >
            {sticker}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ padding: "1.5rem", fontFamily: "sans-serif", textAlign: "center", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "22px", fontWeight: "bold", color: "#1e293b", marginBottom: "0.25rem" }}>Rubik's Cube Learning Sandbox</h1>
      <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "1.5rem" }}>Scramble and solve using your own custom move engine!</p>

      {/* 2D Cross Net Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, max-content)", gridTemplateRows: "repeat(3, max-content)", gap: "12px", justifyContent: "center", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ gridColumn: "2" }}><FaceGrid faceName="U" label="UP" /></div>
        <div style={{ gridRow: "2", gridColumn: "1" }}><FaceGrid faceName="L" label="LEFT" /></div>
        <div style={{ gridRow: "2", gridColumn: "2" }}><FaceGrid faceName="F" label="FRONT" /></div>
        <div style={{ gridRow: "2", gridColumn: "3" }}><FaceGrid faceName="R" label="RIGHT" /></div>
        <div style={{ gridRow: "2", gridColumn: "4" }}><FaceGrid faceName="B" label="BACK" /></div>
        <div style={{ gridRow: "3", gridColumn: "2" }}><FaceGrid faceName="D" label="DOWN" /></div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <button onClick={() => setCube(prev => turnFrontClockwise(prev))} style={{ padding: "10px 16px", backgroundColor: "#22c55e", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          Rotate Front (F)
        </button>
        <button onClick={() => setCube(prev => turnUpClockwise(prev))} style={{ padding: "10px 16px", backgroundColor: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          Rotate Up (U)
        </button>
        <button onClick={handleScrambleCube} style={{ padding: "10px 16px", backgroundColor: "#f97316", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          Scramble Cube
        </button>
        <button onClick={handleSolveCube} style={{ padding: "10px 16px", backgroundColor: "#8b5cf6", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          Compute Solution
        </button>
        <button onClick={runCubeTests} style={{ padding: "10px 16px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
          Test Face Functions
        </button>
      </div>

      {/* Displaying Solution Steps */}
      {solutionSteps.length > 0 && (
        <div style={{ maxWidth: "400px", margin: "1.5rem auto", backgroundColor: "#fff", padding: "1.2rem", borderRadius: "8px", border: "1px solid #cbd5e1", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#1e293b" }}>
            Playback Step {currentStepIndex} of {solutionSteps.length}
          </h3>
          
          <div style={{ fontSize: "28px", fontWeight: "bold", color: currentStepIndex === solutionSteps.length ? "#22c55e" : "#8b5cf6", margin: "1rem 0" }}>
            {currentStepIndex === solutionSteps.length 
              ? "Cube Solved Successfully! 🎉" 
              : solutionSteps[currentStepIndex]}
          </div>

          <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "1rem" }}>
            <button 
              onClick={handlePrevStep} 
              disabled={currentStepIndex === 0}
              style={{ padding: "6px 12px", backgroundColor: currentStepIndex === 0 ? "#e2e8f0" : "#64748b", color: "#fff", border: "none", borderRadius: "4px", cursor: currentStepIndex === 0 ? "not-allowed" : "pointer" }}
            >
              Previous
            </button>
            <button 
              onClick={handleNextStep} 
              disabled={currentStepIndex >= solutionSteps.length}
              style={{ padding: "6px 12px", backgroundColor: currentStepIndex >= solutionSteps.length ? "#e2e8f0" : "#8b5cf6", color: "#fff", border: "none", borderRadius: "4px", cursor: currentStepIndex >= solutionSteps.length ? "not-allowed" : "pointer" }}
            >
              Next Move
            </button>
          </div>
        </div>
      )}
    </div>
  );
}