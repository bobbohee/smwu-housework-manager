export function drawWinners(
  candidates: string[],
  count: number,
  rng: () => number = Math.random,
): string[] {
  if (count <= 0 || candidates.length === 0) return [];
  const n = Math.min(count, candidates.length);
  const arr = [...candidates];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}
