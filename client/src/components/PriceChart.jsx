import { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { api } from '../api.js';
import { usePolling } from '../hooks.js';

const RANGES = ['1D', '5D', '1M', '6M', '1Y', '5Y'];
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export default function PriceChart({ symbol, height = 300 }) {
  const [range, setRange] = useState('1M');
  const [kind, setKind] = useState('line');
  const box = useRef(null);
  const { data, loading, error } = usePolling(() => api.history(symbol, range), range === '1D' || range === '5D' ? 60_000 : 600_000, [symbol, range]);

  const fresh = data && data.symbol === symbol.toUpperCase() && data.range === range;
  const candles = fresh ? dedupe(data.candles) : [];

  useEffect(() => {
    const el = box.current;
    if (!el || !candles.length) return undefined;

    const up = css('--up'); const down = css('--down');
    const chart = createChart(el, {
      height,
      layout: { background: { color: 'transparent' }, textColor: css('--muted'), fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 },
      grid: { vertLines: { color: css('--line') }, horzLines: { color: css('--line') } },
      rightPriceScale: { borderColor: css('--line') },
      timeScale: { borderColor: css('--line'), timeVisible: range === '1D' || range === '5D' },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
    });

    const rising = candles[candles.length - 1].close >= candles[0].close;
    if (kind === 'candles') {
      chart.addCandlestickSeries({ upColor: up, downColor: down, borderVisible: false, wickUpColor: up, wickDownColor: down })
        .setData(candles);
    } else {
      chart.addAreaSeries({
        lineColor: rising ? up : down, lineWidth: 2,
        topColor: rising ? 'rgba(25,211,162,0.18)' : 'rgba(255,92,108,0.18)', bottomColor: 'rgba(0,0,0,0)',
        priceLineVisible: false,
      }).setData(candles.map((c) => ({ time: c.time, value: c.close })));
    }
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [candles.length, candles[0]?.time, candles[candles.length - 1]?.close, kind, range, height]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="chart">
      <div className="chart-bar">
        <div className="seg" role="group" aria-label="Range">
          {RANGES.map((r) => (
            <button key={r} className={r === range ? 'on' : ''} aria-pressed={r === range} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Chart type">
          <button className={kind === 'line' ? 'on' : ''} aria-pressed={kind === 'line'} onClick={() => setKind('line')}>Line</button>
          <button className={kind === 'candles' ? 'on' : ''} aria-pressed={kind === 'candles'} onClick={() => setKind('candles')}>Candles</button>
        </div>
      </div>
      <div className="chart-body" style={{ height }}>
        {candles.length > 0 && <div ref={box} style={{ height }} />}
        {!candles.length && (
          <div className="empty">
            {loading || (!fresh && !error) ? 'Loading chart…' : error || `No chart data for ${symbol} from the current providers.`}
          </div>
        )}
      </div>
      {fresh && data.source && <div className="chart-foot">Chart data: {data.source}</div>}
    </div>
  );
}

function dedupe(rows) {
  const seen = new Set();
  return [...rows].sort((a, b) => a.time - b.time).filter((r) => !seen.has(r.time) && seen.add(r.time));
}
