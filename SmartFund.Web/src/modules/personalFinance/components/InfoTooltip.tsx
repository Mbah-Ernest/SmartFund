import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

type InfoTooltipProps = {
  text: string;
  children?: React.ReactNode;
  className?: string;
};

const TOOLTIP_WIDTH = 224; // w-56
const EDGE_PADDING = 12;

type Coords = {
  top: number;
  left: number;
  arrowLeft: number;
  placement: 'top' | 'bottom';
};

export default function InfoTooltip({ text, children, className }: InfoTooltipProps) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const placement = rect.top < 120 ? 'bottom' : 'top';
    const top = placement === 'top' ? rect.top - 8 : rect.bottom + 8;

    const vw = window.innerWidth;
    const half = TOOLTIP_WIDTH / 2;

    let left = centerX - half;
    if (left < EDGE_PADDING) left = EDGE_PADDING;
    if (left + TOOLTIP_WIDTH > vw - EDGE_PADDING)
      left = vw - EDGE_PADDING - TOOLTIP_WIDTH;

    const arrowLeft = centerX - left;

    setCoords({ top, left, arrowLeft, placement });
  }, []);

  const hide = useCallback(() => setCoords(null), []);

  return (
    <span
      ref={triggerRef}
      className={`inline-flex cursor-help ${className ?? ''}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      role="note"
      aria-label={text}
    >
      {children ?? (
        <svg
          className="h-3.5 w-3.5 text-slate-400 transition-colors hover:text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827m0 4.5h.008v.008H12v-.008z"
          />
          <circle cx="12" cy="12" r="9.5" strokeWidth={1.5} />
        </svg>
      )}

      {coords &&
        createPortal(
          <span
            className="pointer-events-none fixed z-[9999] w-56 rounded-xl bg-slate-800 px-3 py-2.5 text-[12px] font-medium leading-relaxed text-slate-100 shadow-xl ring-1 ring-slate-700"
            style={{
              top: coords.top,
              left: coords.left,
              transform:
                coords.placement === 'top'
                  ? 'translateY(-100%)'
                  : 'translateY(0)',
            }}
            role="tooltip"
          >
            {text}
            <span
              className={`absolute border-[5px] border-transparent ${
                coords.placement === 'top'
                  ? 'top-full border-t-slate-800'
                  : 'bottom-full border-b-slate-800'
              }`}
              style={{ left: coords.arrowLeft, transform: 'translateX(-50%)' }}
            />
          </span>,
          document.body
        )}
    </span>
  );
}
