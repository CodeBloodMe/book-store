import { Clock } from 'lucide-react';

interface ReadingTimeEstimateProps {
  pageCount: number | null;
}

/**
 * Estimates reading time from page count.
 * Average reading speed: ~250 words/page, ~238 words/min
 * Simplified to: ~1.05 min/page ≈ ~1 min/page for display.
 */
export default function ReadingTimeEstimate({ pageCount }: ReadingTimeEstimateProps) {
  if (!pageCount || pageCount <= 0) return null;

  const totalMinutes = Math.round(pageCount * 1.05);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let displayTime: string;
  if (hours === 0) {
    displayTime = `${minutes} min`;
  } else if (minutes === 0) {
    displayTime = `${hours}h`;
  } else {
    displayTime = `${hours}h ${minutes}m`;
  }

  // Categorize length
  let lengthLabel: string;
  if (pageCount < 150) {
    lengthLabel = 'Quick Read';
  } else if (pageCount < 300) {
    lengthLabel = 'Standard';
  } else if (pageCount < 500) {
    lengthLabel = 'Long Read';
  } else {
    lengthLabel = 'Epic';
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-wider">
        <Clock className="w-3.5 h-3.5" /> Reading Time
      </span>
      <span className="font-semibold text-gray-900">
        {displayTime}
      </span>
      <span className="text-xs text-gray-500">
        {pageCount} pages · {lengthLabel}
      </span>
    </div>
  );
}
