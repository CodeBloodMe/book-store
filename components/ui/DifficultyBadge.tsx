// ============================================================
// DifficultyBadge — Displays Beginner / Intermediate / Advanced
// using the color-coded badge system from the design system.
// Server Component safe.
// ============================================================

import type { DifficultyLevel } from '@/types/database';

interface DifficultyBadgeProps {
  level: DifficultyLevel | null | undefined;
}

const classMap: Record<DifficultyLevel, string> = {
  Beginner:     'badge badge-beginner',
  Intermediate: 'badge badge-intermediate',
  Advanced:     'badge badge-advanced',
};

const labelMap: Record<DifficultyLevel, string> = {
  Beginner:     '● Beginner',
  Intermediate: '◆ Intermediate',
  Advanced:     '▲ Advanced',
};

export default function DifficultyBadge({ level }: DifficultyBadgeProps) {
  if (!level) return null;
  return (
    <span className={classMap[level]} role="img" aria-label={`Difficulty: ${level}`}>
      {labelMap[level]}
    </span>
  );
}
