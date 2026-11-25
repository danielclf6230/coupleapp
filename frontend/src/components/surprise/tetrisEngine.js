export const WIDTH = 10;
export const HEIGHT = 18;
export const FALL_INTERVAL = 1100;
const SHAPES = [
  [[1, 1, 1, 1]],
  [
    [2, 2],
    [2, 2],
  ],
  [
    [0, 3, 0],
    [3, 3, 3],
  ],
  [
    [4, 0, 0],
    [4, 4, 4],
  ],
  [
    [0, 0, 5],
    [5, 5, 5],
  ],
  [
    [0, 6, 6],
    [6, 6, 0],
  ],
  [
    [7, 7, 0],
    [0, 7, 7],
  ],
];
export function newPiece() {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)].map((row) => [
    ...row,
  ]);
  return { shape, x: Math.floor((WIDTH - shape[0].length) / 2), y: 0 };
}
export function newGame() {
  return {
    board: Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0)),
    piece: newPiece(),
    score: 0,
    over: false,
  };
}
export function fits(board, piece) {
  return piece.shape.every((row, y) =>
    row.every(
      (cell, x) =>
        !cell ||
        (piece.x + x >= 0 &&
          piece.x + x < WIDTH &&
          piece.y + y >= 0 &&
          piece.y + y < HEIGHT &&
          !board[piece.y + y][piece.x + x]),
    ),
  );
}
export function move(game, action) {
  if (game.over) return game;
  let piece = { ...game.piece };
  if (action === "left" || action === "right") {
    piece.x += action === "left" ? -1 : 1;
    return fits(game.board, piece) ? { ...game, piece } : game;
  }
  if (action === "rotate") {
    piece.shape = piece.shape[0].map((_, x) =>
      piece.shape.map((row) => row[x]).reverse(),
    );
    for (const shift of [0, -1, 1, -2, 2]) {
      const candidate = { ...piece, x: piece.x + shift };
      if (fits(game.board, candidate)) return { ...game, piece: candidate };
    }
    return game;
  }
  if (action === "drop") {
    while (fits(game.board, { ...piece, y: piece.y + 1 })) {
      piece.y++;
    }
  } else if (fits(game.board, { ...piece, y: piece.y + 1 })) {
    return {
      ...game,
      piece: { ...piece, y: piece.y + 1 },
      score: game.score,
    };
  }
  let board = game.board.map((row) => [...row]);
  piece.shape.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell) board[piece.y + y][piece.x + x] = cell;
    }),
  );
  const remaining = board.filter((row) => row.some((cell) => !cell));
  const lines = HEIGHT - remaining.length;
  board = [
    ...Array.from({ length: lines }, () => Array(WIDTH).fill(0)),
    ...remaining,
  ];
  const next = newPiece();
  return {
    board,
    piece: next,
    // Progress comes from clearing lines, rather than repeatedly dropping pieces.
    score: game.score + [0, 100, 260, 450, 700][lines],
    over: !fits(board, next),
  };
}
