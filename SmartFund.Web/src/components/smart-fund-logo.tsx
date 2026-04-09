import { cn } from '@/lib/utils';

interface SmartFundLogoProps {
  className?: string;
  showText?: boolean;
}

export function SmartFundLogo({ className, showText = true }: SmartFundLogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 text-primary-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-background" />
      </div>
      {showText && (
        <span className="font-bold text-xl tracking-tight">
          Smart<span className="text-primary">Fund</span>
        </span>
      )}
    </div>
  );
}
