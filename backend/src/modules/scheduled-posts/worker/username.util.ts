export function normalizeInstagramUsername(input: string): string {
  let value = input.trim();
  value = value.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  value = value.split('/')[0].split('?')[0];
  value = value.replace(/^@/, '');
  return value;
}
