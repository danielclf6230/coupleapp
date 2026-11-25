import { newGame, fits, move, HEIGHT, WIDTH } from "./tetrisEngine";
test("wall kicks keep rotations within the board and drops never mutate the previous board", () => {
  const game = newGame();
  game.piece = { shape: [[1, 1, 1, 1]], x: 6, y: 0 };
  const rotated = move(game, "rotate");
  expect(fits(rotated.board, rotated.piece)).toBe(true);
  expect(rotated.piece.shape.length).toBe(4);
  const dropped = move(rotated, "drop");
  expect(game.board.flat().every((c) => c === 0)).toBe(true);
  expect(dropped.board.flat().filter(Boolean)).toHaveLength(4);
  expect(dropped.score).toBe(0);
});
test("a full row clears, scores points, and retains the board dimensions", () => {
  const game = newGame();
  game.board[HEIGHT - 1] = [0, 0, 0, 0, 2, 2, 2, 2, 2, 2];
  game.piece = { shape: [[1, 1, 1, 1]], x: 0, y: 0 };
  const dropped = move(game, "drop");
  expect(dropped.board).toHaveLength(HEIGHT);
  expect(dropped.board.every((row) => row.length === WIDTH)).toBe(true);
  expect(dropped.board.flat().every((c) => c === 0)).toBe(true);
  expect(dropped.score).toBe(100);
});

test("hard and soft drops cannot farm points without clearing lines", () => {
  const game = newGame();
  expect(move(game, "down").score).toBe(0);
  expect(move(game, "drop").score).toBe(0);
});

test("clearing multiple rows rewards careful placement", () => {
  const game = newGame();
  game.board[HEIGHT - 1] = [0, 0, 2, 2, 2, 2, 2, 2, 2, 2];
  game.board[HEIGHT - 2] = [0, 0, 2, 2, 2, 2, 2, 2, 2, 2];
  game.piece = {
    shape: [
      [1, 1],
      [1, 1],
    ],
    x: 0,
    y: 0,
  };
  expect(move(game, "drop").score).toBe(260);
});
test("blocked spawn ends the game and disallows further movement", () => {
  const game = newGame();
  game.board[0] = [0, 0, 1, 1, 1, 1, 1, 1, 0, 0];
  game.board[1] = [0, 0, 1, 1, 1, 1, 1, 1, 0, 0];
  game.piece = {
    shape: [
      [2, 2],
      [2, 2],
    ],
    x: 0,
    y: 5,
  };
  const dropped = move(game, "drop");
  expect(dropped.over).toBe(true);
  expect(move(dropped, "left")).toBe(dropped);
});
