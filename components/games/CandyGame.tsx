// components/games/CandyGame.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { GameProps } from "./gameTypes";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const BB_SIZE = 8;
const DRAG_OFFSET_Y = 58;

const BB_COLORS = [
  { bg: "#ef4444", top: "#fca5a5", side: "#b91c1c", glow: "#ef444488" },
  { bg: "#f59e0b", top: "#fde68a", side: "#92400e", glow: "#f59e0b88" },
  { bg: "#3b82f6", top: "#93c5fd", side: "#1e40af", glow: "#3b82f688" },
  { bg: "#10b981", top: "#6ee7b7", side: "#064e3b", glow: "#10b98188" },
  { bg: "#a855f7", top: "#d8b4fe", side: "#581c87", glow: "#a855f788" },
  { bg: "#06b6d4", top: "#a5f3fc", side: "#0c4a6e", glow: "#06b6d488" },
];

const BB_SHAPES = [
  { cells: [[0, 0]], w: 1, h: 1 },
  {
    cells: [
      [0, 0],
      [0, 1],
    ],
    w: 2,
    h: 1,
  },
  {
    cells: [
      [0, 0],
      [1, 0],
    ],
    w: 1,
    h: 2,
  },
  {
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    w: 3,
    h: 1,
  },
  {
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    w: 1,
    h: 3,
  },
  {
    cells: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    w: 2,
    h: 2,
  },
  {
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
    ],
    w: 2,
    h: 3,
  },
  {
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 1],
    ],
    w: 3,
    h: 2,
  },
  {
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
    w: 3,
    h: 2,
  },
  {
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
    w: 4,
    h: 1,
  },
  {
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
    w: 1,
    h: 4,
  },
  {
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [2, 0],
    ],
    w: 3,
    h: 3,
  },
  {
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
    w: 2,
    h: 3,
  },
  {
    cells: [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ],
    w: 2,
    h: 3,
  },
];

type BBCell = number | null;
type BBPiece = { shapeIdx: number; colorIdx: number };

// Particle type for explosion effects
type Particle = {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
};

function makeBBBoard(): BBCell[][] {
  return Array.from({ length: BB_SIZE }, () => Array(BB_SIZE).fill(null));
}
function randomPiece(): BBPiece {
  return {
    shapeIdx: Math.floor(Math.random() * BB_SHAPES.length),
    colorIdx: Math.floor(Math.random() * BB_COLORS.length),
  };
}
function randomTray(): BBPiece[] {
  return [randomPiece(), randomPiece(), randomPiece()];
}
function canPlace(
  board: BBCell[][],
  piece: BBPiece,
  sr: number,
  sc: number,
): boolean {
  return BB_SHAPES[piece.shapeIdx].cells.every(([dr, dc]) => {
    const r = sr + dr,
      c = sc + dc;
    return (
      r >= 0 && r < BB_SIZE && c >= 0 && c < BB_SIZE && board[r][c] === null
    );
  });
}
function doPlace(
  board: BBCell[][],
  piece: BBPiece,
  sr: number,
  sc: number,
): BBCell[][] {
  const nb = board.map((r) => [...r]);
  BB_SHAPES[piece.shapeIdx].cells.forEach(([dr, dc]) => {
    nb[sr + dr][sc + dc] = piece.colorIdx;
  });
  return nb;
}
function clearLines(board: BBCell[][]): {
  board: BBCell[][];
  lines: number;
  clearedCells: Set<string>;
  clearedRows: number[];
  clearedCols: number[];
} {
  const nb = board.map((r) => [...r]);
  const fullR = new Set<number>(),
    fullC = new Set<number>();
  for (let r = 0; r < BB_SIZE; r++)
    if (nb[r].every((c) => c !== null)) fullR.add(r);
  for (let c = 0; c < BB_SIZE; c++)
    if (nb.every((row) => row[c] !== null)) fullC.add(c);

  const clearedCells = new Set<string>();
  fullR.forEach((r) => {
    for (let c = 0; c < BB_SIZE; c++) {
      clearedCells.add(`${r},${c}`);
      nb[r][c] = null;
    }
  });
  fullC.forEach((c) => {
    for (let r = 0; r < BB_SIZE; r++) {
      clearedCells.add(`${r},${c}`);
      nb[r][c] = null;
    }
  });
  return {
    board: nb,
    lines: fullR.size + fullC.size,
    clearedCells,
    clearedRows: Array.from(fullR),
    clearedCols: Array.from(fullC),
  };
}
function trayHasMove(board: BBCell[][], tray: (BBPiece | null)[]): boolean {
  return tray.some((p) => {
    if (!p) return false;
    for (let r = 0; r < BB_SIZE; r++)
      for (let c = 0; c < BB_SIZE; c++)
        if (canPlace(board, p, r, c)) return true;
    return false;
  });
}

const ABSOLUTE_FILL = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 99,
};
const GRID_BG = "#080e1a";
const CELL_LINE = "#ffffff06";

// ── LEVEL CONFIG ──────────────────────────────────────────────────────────────
const LEVELS = [
  { threshold: 0, label: "Başlangıç", color: "#64748b" },
  { threshold: 200, label: "Çırak", color: "#10b981" },
  { threshold: 600, label: "Usta", color: "#3b82f6" },
  { threshold: 1200, label: "Uzman", color: "#a855f7" },
  { threshold: 2500, label: "Efsane", color: "#f59e0b" },
  { threshold: 5000, label: "⚡ TANRI", color: "#ef4444" },
];
function getLevel(score: number) {
  let lv = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (score >= LEVELS[i].threshold) lv = i;
  }
  return lv;
}
function getLevelProgress(score: number) {
  const lv = getLevel(score);
  if (lv >= LEVELS.length - 1) return 1;
  const from = LEVELS[lv].threshold;
  const to = LEVELS[lv + 1].threshold;
  return Math.min((score - from) / (to - from), 1);
}

export default function CandyGame({ insets }: GameProps) {
  const PAD = 12;
  const cellSize = Math.floor((SCREEN_WIDTH - PAD * 2) / BB_SIZE);
  const boardPx = cellSize * BB_SIZE;

  // ── Oyun state ───────────────────────────────────────────────────────────
  const [board, setBoard] = useState<BBCell[][]>(makeBBBoard);
  const [tray, setTray] = useState<(BBPiece | null)[]>(randomTray);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [combo, setCombo] = useState(0);
  const [level, setLevel] = useState(0);
  const lastClearTime = useRef<number>(0);
  const particleIdRef = useRef(0);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<number | null>(null);
  const [hoverCell, setHoverCell] = useState<{ r: number; c: number } | null>(
    null,
  );
  const [clearingCells, setClearingCells] = useState<Map<string, number>>(
    new Map(),
  );
  const [scorePop, setScorePop] = useState<{
    val: number;
    id: number;
    isCombo?: boolean;
    x?: number;
    y?: number;
  } | null>(null);
  const [comboText, setComboText] = useState<{
    label: string;
    id: number;
    tier: number;
  } | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [showLevelUp, setShowLevelUp] = useState<string | null>(null);
  const [perfectClear, setPerfectClear] = useState(false);

  // ── Animasyon referansları ───────────────────────────────────────────────
  const trayScales = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;
  const trayEntryAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const scorePopOpacity = useRef(new Animated.Value(0)).current;
  const scorePopY = useRef(new Animated.Value(0)).current;
  const comboOpacity = useRef(new Animated.Value(0)).current;
  const comboScale = useRef(new Animated.Value(0.5)).current;
  const comboY = useRef(new Animated.Value(0)).current;
  const pulseBorder = useRef(new Animated.Value(0)).current;
  const gridGlow = useRef(new Animated.Value(0)).current;
  const cellAnims = useRef<Record<string, Animated.Value>>({}).current;
  const cellClearAnims = useRef<Record<string, Animated.Value>>({}).current;
  const bestGlow = useRef(new Animated.Value(0)).current;
  const trayPulse = useRef(new Animated.Value(1)).current;
  const trayPulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const ghostShake = useRef(new Animated.Value(0)).current;
  // Screen shake
  const screenShakeX = useRef(new Animated.Value(0)).current;
  const screenShakeY = useRef(new Animated.Value(0)).current;
  // Flash overlay
  const flashOpacity = useRef(new Animated.Value(0)).current;
  // Level up animation
  const levelUpScale = useRef(new Animated.Value(0)).current;
  const levelUpOpacity = useRef(new Animated.Value(0)).current;
  // Perfect clear
  const perfectOpacity = useRef(new Animated.Value(0)).current;
  const perfectScale = useRef(new Animated.Value(0.3)).current;
  // Level bar
  const levelBarProgress = useRef(new Animated.Value(0)).current;
  // Score magnitude pulse (büyük skor anında rakam büyüsün)
  const scoreScale = useRef(new Animated.Value(1)).current;
  // Bubbles
  const bubbles = useRef(
    Array.from({ length: 6 }, (_, i) => ({
      x: new Animated.Value(0.1 + i * 0.16),
      y: new Animated.Value(Math.random()),
      radius: 5 + i * 4,
      dur: 10000 + i * 2000,
    })),
  ).current;

  const getCellAnim = (key: string) => {
    if (!cellAnims[key]) cellAnims[key] = new Animated.Value(1);
    return cellAnims[key];
  };
  const getCellClearAnim = useCallback(
    (key: string) => {
      if (!cellClearAnims[key]) cellClearAnims[key] = new Animated.Value(1);
      return cellClearAnims[key];
    },
    [cellClearAnims],
  );

  // ── Skor sayacı ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = scoreAnim.addListener(({ value }) =>
      setDisplayScore(Math.round(value)),
    );
    return () => scoreAnim.removeListener(id);
  }, [scoreAnim]);

  // ── Bubble loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    bubbles.forEach((b) => {
      const loopY = () => {
        b.y.setValue(1.1);
        Animated.timing(b.y, {
          toValue: -0.1,
          duration: b.dur,
          useNativeDriver: false,
          easing: Easing.linear,
        }).start(({ finished }) => {
          if (finished) loopY();
        });
      };
      loopY();
    });
  }, []);

  // ── Screen Shake ─────────────────────────────────────────────────────────
  const triggerScreenShake = useCallback(
    (intensity: number = 6) => {
      const seq = (axis: Animated.Value) =>
        Animated.sequence([
          Animated.timing(axis, {
            toValue: intensity,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(axis, {
            toValue: -intensity * 0.7,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(axis, {
            toValue: intensity * 0.5,
            duration: 35,
            useNativeDriver: true,
          }),
          Animated.timing(axis, {
            toValue: -intensity * 0.3,
            duration: 35,
            useNativeDriver: true,
          }),
          Animated.timing(axis, {
            toValue: 0,
            duration: 30,
            useNativeDriver: true,
          }),
        ]);
      Animated.parallel([seq(screenShakeX), seq(screenShakeY)]).start();
    },
    [screenShakeX, screenShakeY],
  );

  // ── Flash ─────────────────────────────────────────────────────────────────
  const triggerFlash = useCallback(
    (color: string) => {
      setFlashColor(color);
      flashOpacity.setValue(0.35);
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    },
    [flashOpacity],
  );

  // ── Particles ─────────────────────────────────────────────────────────────
  const spawnParticles = useCallback(
    (centerX: number, centerY: number, color: string, count: number = 12) => {
      const newParticles: Particle[] = Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 60 + Math.random() * 100;
        const px = new Animated.Value(centerX);
        const py = new Animated.Value(centerY);
        const op = new Animated.Value(1);
        const sc = new Animated.Value(0.3 + Math.random() * 0.7);
        const id = particleIdRef.current++;

        const dur = 500 + Math.random() * 300;
        Animated.parallel([
          Animated.timing(px, {
            toValue: centerX + Math.cos(angle) * speed,
            duration: dur,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(py, {
            toValue: centerY + Math.sin(angle) * speed - 40,
            duration: dur,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(op, {
            toValue: 0,
            duration: dur,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(sc, {
              toValue: 1 + Math.random() * 0.5,
              duration: dur * 0.3,
              useNativeDriver: true,
            }),
            Animated.timing(sc, {
              toValue: 0,
              duration: dur * 0.7,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          setParticles((prev) => prev.filter((p) => p.id !== id));
        });

        return {
          id,
          x: px,
          y: py,
          opacity: op,
          scale: sc,
          color,
          size: 4 + Math.random() * 6,
        };
      });

      setParticles((prev) => [...prev, ...newParticles]);
    },
    [],
  );

  // ── Level Up ─────────────────────────────────────────────────────────────
  const triggerLevelUp = useCallback(
    (levelName: string) => {
      setShowLevelUp(levelName);
      levelUpScale.setValue(0.3);
      levelUpOpacity.setValue(1);
      Animated.parallel([
        Animated.spring(levelUpScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 6,
          stiffness: 300,
        }),
        Animated.sequence([
          Animated.delay(1400),
          Animated.timing(levelUpOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => setShowLevelUp(null));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [levelUpScale, levelUpOpacity],
  );

  // ── Perfect Clear ─────────────────────────────────────────────────────────
  const triggerPerfectClear = useCallback(() => {
    setPerfectClear(true);
    perfectOpacity.setValue(1);
    perfectScale.setValue(0.2);
    Animated.parallel([
      Animated.spring(perfectScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 5,
        stiffness: 250,
      }),
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(perfectOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => setPerfectClear(false));
    triggerScreenShake(12);
    triggerFlash("#ffffff");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [perfectOpacity, perfectScale, triggerScreenShake, triggerFlash]);

  // ── Score pulse ───────────────────────────────────────────────────────────
  const pulseScore = useCallback(
    (big: boolean = false) => {
      const target = big ? 1.4 : 1.2;
      scoreScale.setValue(target);
      Animated.spring(scoreScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 6,
        stiffness: 350,
      }).start();
    },
    [scoreScale],
  );

  // ── Seçim değiştiğinde ──────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(gridGlow, {
      toValue: selected !== null ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
    if (selected !== null) {
      trayPulseLoopRef.current?.stop();
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(trayPulse, {
            toValue: 1.07,
            duration: 580,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(trayPulse, {
            toValue: 1.0,
            duration: 580,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ]),
      );
      trayPulseLoopRef.current = loop;
      loop.start();
    } else {
      trayPulseLoopRef.current?.stop();
      trayPulseLoopRef.current = null;
      trayPulse.setValue(1);
    }
  }, [selected, gridGlow, trayPulse]);

  const animateTray = (idx: number, sel: boolean) => {
    Animated.spring(trayScales[idx], {
      toValue: sel ? 1.12 : 1,
      useNativeDriver: true,
      damping: 8,
      stiffness: 300,
    }).start();
  };

  const handleTrayPress = (idx: number) => {
    if (gameOver || !tray[idx]) return;
    if (selected === idx) {
      animateTray(idx, false);
      setSelected(null);
      setHoverCell(null);
    } else {
      if (selected !== null) animateTray(selected, false);
      animateTray(idx, true);
      setSelected(idx);
      setHoverCell(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const animateTrayEntry = useCallback(
    (indices: number[]) => {
      indices.forEach((i, order) => {
        trayEntryAnims[i].setValue(0);
        Animated.sequence([
          Animated.delay(order * 70),
          Animated.spring(trayEntryAnims[i], {
            toValue: 1,
            useNativeDriver: true,
            damping: 12,
            stiffness: 260,
          }),
        ]).start();
      });
    },
    [trayEntryAnims],
  );

  // ── Staggered clear + PARTICLE EXPLOSION ────────────────────────────────
  const animateClear = useCallback(
    (cells: Set<string>, colorIdx: number, boardX: number, boardY: number) => {
      const col = BB_COLORS[colorIdx];
      const coords = Array.from(cells).map((k) => {
        const [r, c] = k.split(",").map(Number);
        return { r, c, key: k };
      });
      coords.sort((a, b) => a.c - b.c || a.r - b.r);

      const newMap = new Map<string, number>();
      coords.forEach((coord, i) => {
        newMap.set(coord.key, i);
        const anim = getCellClearAnim(coord.key);
        anim.setValue(1);
        Animated.sequence([
          Animated.delay(i * 22),
          Animated.timing(anim, {
            toValue: 0,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();

        // Spawn particles at each cell with stagger
        setTimeout(() => {
          const px = boardX + coord.c * cellSize + cellSize / 2;
          const py = boardY + coord.r * cellSize + cellSize / 2;
          spawnParticles(px, py, col.bg, 4);
        }, i * 22);
      });

      setClearingCells(newMap);
      setTimeout(() => setClearingCells(new Map()), coords.length * 22 + 220);
    },
    [getCellClearAnim, spawnParticles, cellSize],
  );

  // ── Board ref for particle coordinates ──────────────────────────────────
  const boardRef = useRef<View>(null);
  const boardOff = useRef({ x: 0, y: 0 });
  const selectedRef = useRef<number | null>(null);
  selectedRef.current = selected;

  const getPosFromTouch = useCallback(
    (px: number, py: number) => {
      const rx = px - boardOff.current.x;
      const ry = py - boardOff.current.y - DRAG_OFFSET_Y;
      const c = Math.floor(rx / cellSize);
      const r = Math.floor(ry / cellSize);
      if (r >= 0 && r < BB_SIZE && c >= 0 && c < BB_SIZE) return { r, c };
      return null;
    },
    [cellSize],
  );

  // ── Hücre yerleştirme ────────────────────────────────────────────────────
  const handleCellPress = useCallback(
    (r: number, c: number) => {
      if (gameOver || selected === null) return;
      const piece = tray[selected];
      if (!piece) return;

      if (!canPlace(board, piece, r, c)) {
        setHoverCell({ r, c });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        ghostShake.setValue(0);
        Animated.sequence([
          Animated.timing(ghostShake, {
            toValue: 1,
            duration: 45,
            useNativeDriver: true,
          }),
          Animated.timing(ghostShake, {
            toValue: -1,
            duration: 45,
            useNativeDriver: true,
          }),
          Animated.timing(ghostShake, {
            toValue: 0.6,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(ghostShake, {
            toValue: 0,
            duration: 35,
            useNativeDriver: true,
          }),
        ]).start();
        setTimeout(() => setHoverCell(null), 280);
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const nb = doPlace(board, piece, r, c);

      // Hücre zıplama
      BB_SHAPES[piece.shapeIdx].cells.forEach(([dr, dc], i) => {
        const key = `${r + dr},${c + dc}`;
        const anim = getCellAnim(key);
        anim.setValue(0);
        Animated.sequence([
          Animated.delay(i * 20),
          Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            damping: 6,
            stiffness: 450,
          }),
        ]).start();
      });

      const {
        board: cleared,
        lines,
        clearedCells,
        clearedRows,
        clearedCols,
      } = clearLines(nb);
      const col = BB_COLORS[piece.colorIdx];

      if (lines > 0) {
        // Büyük temizleme haptiği
        if (lines >= 2) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        // Particle + flash + shake
        animateClear(
          clearedCells,
          piece.colorIdx,
          boardOff.current.x,
          boardOff.current.y,
        );
        triggerFlash(col.bg);
        triggerScreenShake(lines >= 2 ? 10 : 5);

        pulseBorder.setValue(0);
        Animated.sequence([
          Animated.timing(pulseBorder, {
            toValue: 1,
            duration: 120,
            useNativeDriver: false,
          }),
          Animated.timing(pulseBorder, {
            toValue: 0,
            duration: 280,
            useNativeDriver: false,
          }),
        ]).start();

        // Combo sistemi
        const now = Date.now();
        const isCombo = now - lastClearTime.current < 2200;
        lastClearTime.current = now;
        const newCombo = isCombo ? combo + 1 : 1;
        setCombo(newCombo);

        if (newCombo >= 2) {
          const tier =
            newCombo >= 5 ? 3 : newCombo >= 4 ? 2 : newCombo >= 3 ? 1 : 0;
          const label =
            tier === 3
              ? `🔥 ULTRA x${newCombo}`
              : tier === 2
                ? `⚡ MEGA x${newCombo}`
                : tier === 1
                  ? `✨ SÜPER x${newCombo}`
                  : `💥 COMBO x${newCombo}`;
          setComboText({ label, id: Date.now(), tier });
          comboOpacity.setValue(1);
          comboScale.setValue(0.35);
          comboY.setValue(0);

          Animated.parallel([
            Animated.spring(comboScale, {
              toValue: 1,
              useNativeDriver: true,
              damping: 6,
              stiffness: 380,
            }),
            Animated.sequence([
              Animated.delay(700),
              Animated.timing(comboOpacity, {
                toValue: 0,
                duration: 450,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.delay(500),
              Animated.timing(comboY, {
                toValue: -40,
                duration: 600,
                useNativeDriver: true,
              }),
            ]),
          ]).start(() => setComboText(null));
        }
      } else {
        if (Date.now() - lastClearTime.current >= 2200) setCombo(0);
      }

      const comboMultiplier = combo >= 2 ? combo : 1;
      const lineBonus = lines > 0 ? lines * lines * 60 * comboMultiplier : 0;
      const gained = BB_SHAPES[piece.shapeIdx].cells.length * 10 + lineBonus;
      const newScore = score + gained;
      const newBest = Math.max(best, newScore);

      // Level check
      const oldLevel = getLevel(score);
      const newLevel = getLevel(newScore);
      if (newLevel > oldLevel) {
        triggerLevelUp(LEVELS[newLevel].label);
        setLevel(newLevel);
      } else {
        setLevel(newLevel);
      }

      // Level bar animasyonu
      Animated.timing(levelBarProgress, {
        toValue: getLevelProgress(newScore),
        duration: 500,
        useNativeDriver: false,
      }).start();

      if (newBest > best) {
        bestGlow.setValue(1);
        Animated.timing(bestGlow, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: false,
        }).start();
      }

      Animated.timing(scoreAnim, {
        toValue: newScore,
        duration: 320,
        useNativeDriver: false,
      }).start();
      pulseScore(lines >= 2);

      if (gained > 0) {
        scorePopOpacity.setValue(1);
        scorePopY.setValue(0);
        setScorePop({
          val: gained,
          id: Date.now(),
          isCombo: comboMultiplier > 1,
        });
        Animated.parallel([
          Animated.timing(scorePopOpacity, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(scorePopY, {
            toValue: -64,
            duration: 900,
            useNativeDriver: true,
          }),
        ]).start(() => setScorePop(null));
      }

      const newTray = tray.map((p, i) =>
        i === selected ? null : p,
      ) as (BBPiece | null)[];
      const allEmpty = newTray.every((p) => p === null);
      const finalTray = allEmpty ? randomTray() : newTray;

      if (allEmpty) animateTrayEntry([0, 1, 2]);
      else animateTrayEntry([selected]);

      // Perfect clear: tüm board boş
      const isBoardEmpty = cleared.flat().every((c) => c === null);
      if (isBoardEmpty && lines > 0) {
        setTimeout(() => triggerPerfectClear(), 300);
      }

      animateTray(selected, false);
      setBoard(cleared);
      setTray(finalTray);
      setScore(newScore);
      setBest(newBest);
      setSelected(null);
      setHoverCell(null);

      if (!trayHasMove(cleared, finalTray)) setGameOver(true);
    },
    [
      gameOver,
      selected,
      tray,
      board,
      score,
      best,
      combo,
      getCellAnim,
      animateClear,
      triggerFlash,
      triggerScreenShake,
      triggerLevelUp,
      pulseScore,
      triggerPerfectClear,
    ],
  );

  const gridPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => selectedRef.current !== null,
        onMoveShouldSetPanResponder: () => selectedRef.current !== null,
        onPanResponderGrant: (evt) => {
          const pos = getPosFromTouch(
            evt.nativeEvent.pageX,
            evt.nativeEvent.pageY,
          );
          if (pos) setHoverCell(pos);
        },
        onPanResponderMove: (evt) => {
          const pos = getPosFromTouch(
            evt.nativeEvent.pageX,
            evt.nativeEvent.pageY,
          );
          setHoverCell(pos ?? null);
        },
        onPanResponderRelease: (evt) => {
          const pos = getPosFromTouch(
            evt.nativeEvent.pageX,
            evt.nativeEvent.pageY,
          );
          if (pos) handleCellPress(pos.r, pos.c);
          else setHoverCell(null);
        },
      }),
    [getPosFromTouch, handleCellPress],
  );

  const ghostCells = useMemo((): Set<string> => {
    if (selected === null || !hoverCell) return new Set();
    const piece = tray[selected];
    if (!piece) return new Set();
    return new Set(
      BB_SHAPES[piece.shapeIdx].cells.map(
        ([dr, dc]) => `${hoverCell.r + dr},${hoverCell.c + dc}`,
      ),
    );
  }, [selected, hoverCell, tray]);

  const ghostValid = useMemo(() => {
    if (selected === null || !hoverCell) return false;
    const piece = tray[selected];
    if (!piece) return false;
    return canPlace(board, piece, hoverCell.r, hoverCell.c);
  }, [selected, hoverCell, board, tray]);

  const ghostColorIdx =
    selected !== null && tray[selected] ? tray[selected]!.colorIdx : 0;

  const handleReset = () => {
    trayScales.forEach((s) => s.setValue(1));
    trayEntryAnims.forEach((a) => a.setValue(1));
    scoreAnim.setValue(0);
    gridGlow.setValue(0);
    screenShakeX.setValue(0);
    screenShakeY.setValue(0);
    levelBarProgress.setValue(0);
    setBoard(makeBBBoard());
    setTray(randomTray());
    setScore(0);
    setGameOver(false);
    setSelected(null);
    setHoverCell(null);
    setClearingCells(new Map());
    setDisplayScore(0);
    setScorePop(null);
    setCombo(0);
    setComboText(null);
    setParticles([]);
    setLevel(0);
    setShowLevelUp(null);
    setPerfectClear(false);
    lastClearTime.current = 0;
    animateTrayEntry([0, 1, 2]);
  };

  useEffect(() => {
    animateTrayEntry([0, 1, 2]);
  }, []);

  // ── Interpolations ────────────────────────────────────────────────────────
  const pulseBorderColor = pulseBorder.interpolate({
    inputRange: [0, 1],
    outputRange: [selected !== null ? "#3b82f655" : "#1e3a6e33", "#60a5fadd"],
  });
  const bestGlowColor = bestGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ["#fbbf2400", "#fbbf24cc"],
  });
  const ghostShakeX = ghostShake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-5, 0, 5],
  });
  const levelColor = LEVELS[level].color;
  const levelBarW = levelBarProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, boardPx - 4],
  });

  const comboColors = ["#60a5fa", "#10b981", "#a855f7", "#ef4444"];
  const comboTier = comboText?.tier ?? 0;

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: GRID_BG,
        transform: [{ translateX: screenShakeX }, { translateY: screenShakeY }],
      }}
    >
      {/* ── Floating Bubbles ─────────────────────────────────────────────── */}
      {bubbles.map((b, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: b.x.interpolate({
              inputRange: [0, 1],
              outputRange: [0, SCREEN_WIDTH],
            }),
            top: b.y.interpolate({
              inputRange: [0, 1],
              outputRange: [0, SCREEN_HEIGHT],
            }),
            width: b.radius * 2,
            height: b.radius * 2,
            borderRadius: b.radius,
            backgroundColor: "#3b82f605",
            borderWidth: 1,
            borderColor: "#3b82f60c",
            zIndex: 0,
          }}
        />
      ))}

      {/* ── Flash overlay ────────────────────────────────────────────────── */}
      <Animated.View
        pointerEvents="none"
        style={{
          ...ABSOLUTE_FILL,
          zIndex: 200,
          backgroundColor: flashColor ?? "#ffffff",
          opacity: flashOpacity,
        }}
      />

      {/* ── Particles ────────────────────────────────────────────────────── */}
      {particles.map((p) => (
        <Animated.View
          key={p.id}
          pointerEvents="none"
          style={{
            position: "absolute",
            zIndex: 150,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: p.color,
            shadowColor: p.color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 4,
            transform: [
              { translateX: p.x },
              { translateY: p.y },
              { scale: p.scale },
            ],
            opacity: p.opacity,
          }}
        />
      ))}

      {/* ── Level Up banner ─────────────────────────────────────────────── */}
      {showLevelUp && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: "20%",
            left: 0,
            right: 0,
            alignItems: "center",
            zIndex: 160,
            opacity: levelUpOpacity,
            transform: [{ scale: levelUpScale }],
          }}
        >
          <View
            style={{
              backgroundColor: "#000000cc",
              borderRadius: 20,
              paddingHorizontal: 28,
              paddingVertical: 14,
              borderWidth: 2,
              borderColor: levelColor,
            }}
          >
            <Text
              style={{
                color: levelColor,
                fontSize: 13,
                fontWeight: "700",
                textAlign: "center",
                letterSpacing: 2,
              }}
            >
              SEVİYE ATLADI!
            </Text>
            <Text
              style={{
                color: "#fff",
                fontSize: 26,
                fontWeight: "900",
                textAlign: "center",
                marginTop: 2,
              }}
            >
              {showLevelUp}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* ── Perfect Clear ───────────────────────────────────────────────── */}
      {perfectClear && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: "30%",
            left: 0,
            right: 0,
            alignItems: "center",
            zIndex: 165,
            opacity: perfectOpacity,
            transform: [{ scale: perfectScale }],
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 40,
              fontWeight: "900",
              textShadowColor: "#fbbf24",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 24,
            }}
          >
            ✨ PERFECT! ✨
          </Text>
          <Text
            style={{
              color: "#fbbf24",
              fontSize: 18,
              fontWeight: "800",
              marginTop: 4,
            }}
          >
            Tahta Temizlendi!
          </Text>
        </Animated.View>
      )}

      {/* ── Combo ───────────────────────────────────────────────────────── */}
      {comboText && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: "34%",
            left: 0,
            right: 0,
            alignItems: "center",
            zIndex: 155,
            opacity: comboOpacity,
            transform: [{ scale: comboScale }, { translateY: comboY }],
          }}
        >
          <Text
            style={{
              color: comboColors[Math.min(comboTier, 3)],
              fontSize: comboTier >= 2 ? 38 : 30,
              fontWeight: "900",
              letterSpacing: 1,
              textShadowColor: comboColors[Math.min(comboTier, 3)],
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 20,
            }}
          >
            {comboText.label}
          </Text>
        </Animated.View>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: PAD, paddingTop: 8, paddingBottom: 4 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Best */}
          <Animated.View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#ffffff0d",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: bestGlowColor,
              shadowColor: "#fbbf24",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 8,
            }}
          >
            <Text style={{ fontSize: 16 }}>👑</Text>
            <Text style={{ color: "#fbbf24", fontSize: 14, fontWeight: "800" }}>
              {best}
            </Text>
          </Animated.View>

          {/* Score */}
          <View style={{ alignItems: "center" }}>
            <Animated.Text
              style={{
                color: "#fff",
                fontSize: 40,
                fontWeight: "900",
                letterSpacing: -1,
                transform: [{ scale: scoreScale }],
              }}
            >
              {displayScore}
            </Animated.Text>
            {scorePop && (
              <Animated.Text
                style={{
                  position: "absolute",
                  top: -10,
                  color: scorePop.isCombo ? "#f59e0b" : "#4ade80",
                  fontSize: scorePop.isCombo ? 26 : 20,
                  fontWeight: "900",
                  opacity: scorePopOpacity,
                  transform: [{ translateY: scorePopY }],
                  textShadowColor: scorePop.isCombo ? "#f59e0b" : "#4ade80",
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 10,
                }}
              >
                +{scorePop.val}
              </Animated.Text>
            )}
          </View>

          {/* Reset */}
          <TouchableOpacity
            onPress={handleReset}
            style={{
              backgroundColor: "#ffffff0d",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
          >
            <Ionicons name="refresh" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Level bar */}
        <View style={{ marginTop: 8, marginHorizontal: 4 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                color: levelColor,
                fontSize: 10,
                fontWeight: "800",
                letterSpacing: 1,
              }}
            >
              {LEVELS[level].label.toUpperCase()}
            </Text>
            {level < LEVELS.length - 1 && (
              <Text
                style={{ color: "#ffffff40", fontSize: 10, fontWeight: "600" }}
              >
                {LEVELS[level + 1].label} →
              </Text>
            )}
          </View>
          <View
            style={{
              height: 4,
              backgroundColor: "#ffffff10",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <Animated.View
              style={{
                height: 4,
                width: levelBarW,
                backgroundColor: levelColor,
                borderRadius: 2,
                shadowColor: levelColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 6,
              }}
            />
          </View>
        </View>

        <Text
          style={{
            color: selected !== null ? "#60a5fa" : "#ffffff22",
            fontSize: 11,
            textAlign: "center",
            marginTop: 5,
            fontWeight: "600",
          }}
        >
          {selected !== null ? "📌 Grid'e dokun veya sürükle" : "👇 Parça seç"}
        </Text>
      </View>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <Animated.View
        ref={boardRef as any}
        onLayout={() => {
          (boardRef.current as any)?.measure(
            (
              _: any,
              __: any,
              ___: any,
              ____: any,
              pageX: number,
              pageY: number,
            ) => {
              boardOff.current = { x: pageX, y: pageY };
            },
          );
        }}
        {...gridPanResponder.panHandlers}
        style={{
          width: boardPx,
          alignSelf: "center",
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: GRID_BG,
          borderWidth: 2,
          borderColor: selected !== null ? pulseBorderColor : "#1e3a6e33",
          shadowColor: selected !== null ? "#3b82f6" : "#000",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: selected !== null ? 0.4 : 0,
          shadowRadius: selected !== null ? 20 : 0,
          elevation: selected !== null ? 10 : 0,
        }}
      >
        {Array.from({ length: BB_SIZE }, (_, r) => (
          <View key={r} style={{ flexDirection: "row" }}>
            {Array.from({ length: BB_SIZE }, (_, c) => {
              const cell = board[r][c];
              const gkey = `${r},${c}`;
              const isGhost = ghostCells.has(gkey);
              const isClearing = clearingCells.has(gkey);
              const col = cell !== null ? BB_COLORS[cell] : null;
              const ghostCol = BB_COLORS[ghostColorIdx];
              const cellAnim = getCellAnim(gkey);
              const clearAnim = getCellClearAnim(gkey);

              return (
                <TouchableOpacity
                  key={c}
                  activeOpacity={selected !== null ? 0.55 : 1}
                  onPress={() => handleCellPress(r, c)}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderWidth: isGhost ? 1.5 : 0.5,
                    borderColor: isGhost
                      ? ghostValid
                        ? ghostCol.bg
                        : "#ff4444"
                      : CELL_LINE,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "transparent",
                  }}
                >
                  {cell === null && !isGhost && (
                    <View
                      style={{
                        width: 2,
                        height: 2,
                        borderRadius: 1,
                        backgroundColor: "#ffffff08",
                      }}
                    />
                  )}

                  {cell !== null && (
                    <Animated.View
                      style={{
                        width: cellSize - 3,
                        height: cellSize - 3,
                        borderRadius: 5,
                        backgroundColor: col!.bg,
                        shadowColor: col!.bg,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.8,
                        shadowRadius: 6,
                        elevation: 5,
                        transform: [
                          {
                            scale: isClearing
                              ? clearAnim
                              : cellAnim.interpolate({
                                  inputRange: [0, 0.5, 1],
                                  outputRange: [0.2, 1.22, 1],
                                }),
                          },
                        ],
                        opacity: isClearing ? clearAnim : (1 as any),
                      }}
                    >
                      <View
                        style={{
                          position: "absolute",
                          top: 2,
                          left: 2,
                          right: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: col!.top,
                          opacity: 0.65,
                        }}
                      />
                      <View
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 5,
                          borderBottomLeftRadius: 5,
                          borderBottomRightRadius: 5,
                          backgroundColor: col!.side,
                          opacity: 0.5,
                        }}
                      />
                    </Animated.View>
                  )}

                  {isGhost && cell === null && (
                    <Animated.View
                      style={{
                        width: cellSize - 4,
                        height: cellSize - 4,
                        borderRadius: 5,
                        backgroundColor: ghostValid
                          ? ghostCol.bg + "2a"
                          : "#ff444418",
                        borderWidth: 1.5,
                        borderColor: ghostValid
                          ? ghostCol.bg + "cc"
                          : "#ff4444",
                        transform: [
                          { translateX: ghostValid ? 0 : ghostShakeX },
                        ],
                      }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </Animated.View>

      {/* ── Tray ────────────────────────────────────────────────────────── */}
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            paddingHorizontal: PAD,
            alignItems: "center",
            justifyContent: "space-around",
            width: "100%",
          }}
        >
          {tray.map((piece, idx) => {
            if (!piece)
              return (
                <View
                  key={idx}
                  style={{
                    width: (SCREEN_WIDTH - PAD * 2) / 3 - 8,
                    height: 100,
                  }}
                />
              );

            const shape = BB_SHAPES[piece.shapeIdx];
            const col = BB_COLORS[piece.colorIdx];
            const slotW = (SCREEN_WIDTH - PAD * 2) / 3 - 10;
            const miniCell = Math.min(
              Math.floor((slotW - 16) / Math.max(shape.w, shape.h, 2)),
              20,
            );
            const isSelected = selected === idx;

            return (
              <Animated.View
                key={idx}
                style={{
                  transform: [
                    {
                      scale: isSelected
                        ? Animated.multiply(trayScales[idx], trayPulse)
                        : trayScales[idx],
                    },
                    {
                      translateY: trayEntryAnims[idx].interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                  opacity: trayEntryAnims[idx],
                  width: slotW,
                }}
              >
                <TouchableOpacity
                  onPress={() => handleTrayPress(idx)}
                  activeOpacity={0.72}
                  style={{
                    height: 100,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: isSelected ? col.bg + "22" : "#ffffff09",
                    borderRadius: 16,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? col.bg : "#ffffff15",
                    shadowColor: isSelected ? col.bg : "transparent",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isSelected ? 0.6 : 0,
                    shadowRadius: isSelected ? 16 : 0,
                    elevation: isSelected ? 8 : 0,
                  }}
                >
                  {isSelected && (
                    <View
                      style={{
                        position: "absolute",
                        top: 7,
                        right: 9,
                        width: 7,
                        height: 7,
                        borderRadius: 4,
                        backgroundColor: col.bg,
                      }}
                    />
                  )}
                  <View
                    style={{
                      position: "relative",
                      width: shape.w * miniCell,
                      height: shape.h * miniCell,
                    }}
                  >
                    {shape.cells.map(([dr, dc], ci) => (
                      <View
                        key={ci}
                        style={{
                          position: "absolute",
                          top: dr * miniCell + 1,
                          left: dc * miniCell + 1,
                          width: miniCell - 2,
                          height: miniCell - 2,
                          borderRadius: 3,
                          backgroundColor: col.bg,
                          shadowColor: col.bg,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.6,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <View
                          style={{
                            position: "absolute",
                            top: 1,
                            left: 1,
                            right: 3,
                            height: 3,
                            borderRadius: 2,
                            backgroundColor: col.top,
                            opacity: 0.7,
                          }}
                        />
                        <View
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 3,
                            borderBottomLeftRadius: 3,
                            borderBottomRightRadius: 3,
                            backgroundColor: col.side,
                            opacity: 0.5,
                          }}
                        />
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* ── Game Over ───────────────────────────────────────────────────── */}
      {gameOver && (
        <View
          style={{
            ...ABSOLUTE_FILL,
            backgroundColor: "#000000dd",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#0d1a2e",
              borderRadius: 28,
              padding: 36,
              alignItems: "center",
              borderWidth: 2,
              borderColor: "#1e3a6e",
              width: 290,
            }}
          >
            <Text style={{ fontSize: 56 }}>💀</Text>
            <Text
              style={{
                color: "#fff",
                fontSize: 28,
                fontWeight: "900",
                marginTop: 8,
              }}
            >
              Oyun Bitti!
            </Text>
            <View style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: "#94a3b8", fontSize: 13 }}>Skor</Text>
              <Text style={{ color: "#fff", fontSize: 36, fontWeight: "900" }}>
                {score}
              </Text>
            </View>
            <View style={{ marginTop: 6, alignItems: "center" }}>
              <Text style={{ color: "#fbbf24", fontSize: 12 }}>👑 En İyi</Text>
              <Text
                style={{ color: "#fbbf24", fontSize: 22, fontWeight: "900" }}
              >
                {best}
              </Text>
            </View>
            <View
              style={{
                marginTop: 10,
                backgroundColor: levelColor + "22",
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: levelColor,
              }}
            >
              <Text
                style={{ color: levelColor, fontSize: 13, fontWeight: "800" }}
              >
                Seviye: {LEVELS[getLevel(score)].label}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleReset}
              style={{
                marginTop: 22,
                backgroundColor: "#3b82f6",
                paddingHorizontal: 40,
                paddingVertical: 15,
                borderRadius: 16,
                shadowColor: "#3b82f6",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 12,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>
                Tekrar Oyna →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
}
