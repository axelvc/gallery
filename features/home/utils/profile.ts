export function normalizeUsername(username: string) {
  return username.trim().replace(/^@+/, '').replace(/\/$/, '');
}

export function formatCount(value?: number) {
  return typeof value === 'number' ? value.toLocaleString('en-US') : '0';
}
