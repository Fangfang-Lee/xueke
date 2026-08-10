export function formatMs(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1_000))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
