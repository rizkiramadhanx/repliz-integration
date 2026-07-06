import { AutoPostRuleEntity } from '../entities/auto-post-rule.entity';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function applyCaptionRules(
  rawText: string,
  rule: AutoPostRuleEntity,
): string {
  let text = rawText;

  for (const replacement of rule.captionReplacements ?? []) {
    if (!replacement.find) continue;
    const pattern = new RegExp(escapeRegExp(replacement.find), 'gi');
    text = text.replace(pattern, replacement.replace);
  }

  return [rule.captionPrefix, text, rule.captionSuffix]
    .filter(Boolean)
    .join('\n\n');
}

export function stripKeywords(
  caption: string,
  keywords: string[] | null | undefined,
): string {
  if (!keywords || keywords.length === 0) return caption;

  let result = caption;
  for (const keyword of keywords) {
    if (!keyword.trim()) continue;
    const escaped = escapeRegExp(keyword);
    result = result.replace(new RegExp(escaped, 'gi'), '');
  }
  return result.replace(/[ \t]{2,}/g, ' ').trim();
}
