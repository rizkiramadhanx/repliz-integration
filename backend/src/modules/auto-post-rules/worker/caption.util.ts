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
