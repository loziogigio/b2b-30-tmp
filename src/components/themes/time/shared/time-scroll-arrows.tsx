'use client';

interface TimeScrollArrowsProps {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScrollLeft: () => void;
  onScrollRight: () => void;
}

const arrowBtnClass =
  'w-9 h-9 rounded-[10px] border-[1.5px] border-[var(--time-gray-200)] flex items-center justify-center transition-all disabled:bg-[var(--time-gray-50)] disabled:text-[var(--time-gray-200)] enabled:bg-white enabled:text-[var(--time-dark)] enabled:cursor-pointer';

export default function TimeScrollArrows({
  canScrollLeft,
  canScrollRight,
  onScrollLeft,
  onScrollRight,
}: TimeScrollArrowsProps) {
  if (!canScrollLeft && !canScrollRight) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onScrollLeft}
        disabled={!canScrollLeft}
        className={arrowBtnClass}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <polyline points="15,18 9,12 15,6" />
        </svg>
      </button>
      <button
        onClick={onScrollRight}
        disabled={!canScrollRight}
        className={arrowBtnClass}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <polyline points="9,6 15,12 9,18" />
        </svg>
      </button>
    </div>
  );
}
