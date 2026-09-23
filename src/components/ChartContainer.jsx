import React, { useEffect, useRef } from 'react';
import { init, dispose } from 'klinecharts';
import { TV_DARK_THEME } from '../chart/klineConfig';
import { 
  registerFootprintIndicator, 
  FOOTPRINT_INDICATOR_NAME,
  registerDeltaIndicator,
  DELTA_INDICATOR_NAME
} from '../chart/footprintIndicator';
import { activateDrawingTool } from '../chart/drawingTools';

export function ChartContainer({
  chartMode,
  activeTool,
  onChartReady,
  optionsData,
  subIndicator = 'DELTA', // 'DELTA' or 'VOL'
  onToggleSubIndicator,
}) {
  const containerRef = useRef(null);
  const chartInstance = useRef(null);
  const isFootprintActiveRef = useRef(false);
  const subPaneIdRef = useRef(null);
  const currentSubIndicatorRef = useRef(subIndicator);

  useEffect(() => {
    if (!containerRef.current) return;

    // Register custom Volume Footprint & Delta Bar indicators
    registerFootprintIndicator();
    registerDeltaIndicator();

    // Initialize KLineCharts with dark theme
    const chart = init(containerRef.current, {
      styles: TV_DARK_THEME,
    });
    chartInstance.current = chart;

    // Create Delta Bar sub-pane by default
    try {
      const paneId = chart.createIndicator(
        subIndicator === 'DELTA' ? DELTA_INDICATOR_NAME : 'VOL', 
        false, 
        { height: 90, dragEnabled: true }
      );
      subPaneIdRef.current = paneId;
      currentSubIndicatorRef.current = subIndicator;
    } catch (e) {
      console.warn('Sub-pane indicator init error:', e);
    }

    // Set initial bar space wide enough for cluster visualization
    try {
      chart.setBarSpace(chartMode === 'FOOTPRINT' ? 55 : 12);
    } catch (e) {}

    // Responsive resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    });
    resizeObserver.observe(containerRef.current);

    if (onChartReady) {
      onChartReady(chart);
    }

    return () => {
      resizeObserver.disconnect();
      if (containerRef.current) {
        dispose(containerRef.current);
      }
      chartInstance.current = null;
    };
  }, []);

  // Handle Chart Mode Switch: Standard Candlesticks vs Volume Footprint
  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart) return;

    if (chartMode === 'FOOTPRINT') {
      chart.setStyles({
        candle: {
          type: 'candle_solid',
          bar: {
            upColor: 'rgba(8, 153, 129, 0.1)',
            downColor: 'rgba(242, 54, 69, 0.1)',
            upBorderColor: 'rgba(8, 153, 129, 0.35)',
            downBorderColor: 'rgba(242, 54, 69, 0.35)',
            upWickColor: 'rgba(8, 153, 129, 0.35)',
            downWickColor: 'rgba(242, 54, 69, 0.35)',
          }
        }
      });

      if (!isFootprintActiveRef.current) {
        try {
          chart.createIndicator(FOOTPRINT_INDICATOR_NAME, true, { id: 'candle_pane' });
          isFootprintActiveRef.current = true;
        } catch (err) {
          console.warn('Error creating footprint indicator:', err);
        }
      }

      try {
        chart.setBarSpace(60);
      } catch (e) {}
    } else {
      chart.setStyles({
        candle: {
          type: 'candle_solid',
          bar: {
            upColor: '#089981',
            downColor: '#f23645',
            upBorderColor: '#089981',
            downBorderColor: '#f23645',
            upWickColor: '#089981',
            downWickColor: '#f23645',
          }
        }
      });

      if (isFootprintActiveRef.current) {
        try {
          chart.removeIndicator('candle_pane', FOOTPRINT_INDICATOR_NAME);
          isFootprintActiveRef.current = false;
        } catch (err) {
          console.warn('Error removing footprint indicator:', err);
        }
      }

      try {
        chart.setBarSpace(10);
      } catch (e) {}
    }
  }, [chartMode]);

  // Handle sub-pane indicator change: Delta Bar vs Volume
  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart) return;

    if (currentSubIndicatorRef.current !== subIndicator) {
      try {
        if (subPaneIdRef.current) {
          chart.removeIndicator(subPaneIdRef.current);
        }
        const newPaneId = chart.createIndicator(
          subIndicator === 'DELTA' ? DELTA_INDICATOR_NAME : 'VOL',
          false,
          { height: 90, dragEnabled: true }
        );
        subPaneIdRef.current = newPaneId;
        currentSubIndicatorRef.current = subIndicator;
      } catch (err) {
        console.warn('Error switching sub indicator:', err);
      }
    }
  }, [subIndicator]);

  // Handle active drawing tool change
  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart || !activeTool) return;
    activateDrawingTool(chart, activeTool);
  }, [activeTool]);

  return (
    <div className="relative h-full w-full bg-[#131722] overflow-hidden">
      <div 
        ref={containerRef} 
        className="h-full w-full"
        style={{ background: '#131722' }}
      />

      {/* Floating Options GEX Walls Badges */}
      {optionsData && optionsData.callWall && (
        <div className="absolute top-2 right-3 pointer-events-none flex flex-col items-end gap-1 font-mono text-[10px] z-10">
          <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-2 py-0.5 rounded shadow">
            CALL WALL: ${optionsData.callWall.toLocaleString()} (Resistance)
          </div>
          {optionsData.maxPain && (
            <div className="bg-amber-950/80 border border-amber-500/50 text-amber-300 px-2 py-0.5 rounded shadow">
              MAX PAIN: ${optionsData.maxPain.toLocaleString()}
            </div>
          )}
          {optionsData.putWall && (
            <div className="bg-rose-950/80 border border-rose-500/50 text-rose-300 px-2 py-0.5 rounded shadow">
              PUT WALL: ${optionsData.putWall.toLocaleString()} (Support)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
