import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

interface TradingViewChartProps {
  symbol: string;
  height?: number;
}

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

let scriptLoaded = false;

function loadTradingViewScript(): Promise<void> {
  if (scriptLoaded || window.TradingView) {
    scriptLoaded = true;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function TradingViewChart({ symbol, height = 500 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<unknown>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      await loadTradingViewScript();
      if (cancelled || !containerRef.current || !window.TradingView) return;

      // Clear previous widget
      containerRef.current.innerHTML = '';

      widgetRef.current = new window.TradingView.widget({
        container_id: containerRef.current.id,
        symbol,
        interval: 'D',
        timezone: 'Africa/Lagos',
        theme: resolvedTheme === 'dark' ? 'dark' : 'light',
        style: '1',
        locale: 'en',
        toolbar_bg: resolvedTheme === 'dark' ? '#1a1a2e' : '#f5f5f5',
        enable_publishing: false,
        allow_symbol_change: false,
        studies: ['RSI@tv-basicstudies', 'MACD@tv-basicstudies'],
        drawings_access: { type: 'all', tools: [{ name: 'Trend Line' }] },
        height,
        width: '100%',
        hide_side_toolbar: false,
        save_image: false,
      });
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [symbol, resolvedTheme, height]);

  const containerId = `tv_chart_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return (
    <div
      id={containerId}
      ref={containerRef}
      style={{ height }}
      className="w-full rounded-md overflow-hidden border border-border"
    />
  );
}
