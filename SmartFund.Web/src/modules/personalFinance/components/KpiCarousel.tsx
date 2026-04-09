import React from 'react';
import { cn } from '@/lib/utils';

interface KpiCarouselProps {
  children: React.ReactNode;
  className?: string;
}

export default function KpiCarousel({ children, className }: KpiCarouselProps) {
  return (
    <div
      className={cn(
        'flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2',
        'xl:grid xl:grid-cols-3 xl:overflow-visible xl:snap-none xl:pb-0',
        'scrollbar-hide',
        className
      )}
    >
      {React.Children.map(children, (child, index) => (
        <div key={index} className="snap-start shrink-0 w-[86vw] sm:w-[70vw] md:w-[52vw] lg:w-[46vw] xl:w-auto xl:shrink xl:h-full">
          {child}
        </div>
      ))}
    </div>
  );
}
