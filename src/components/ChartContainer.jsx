import React, { useEffect, useRef } from 'react';
import { init, dispose } from 'klinecharts';
import { TV_DARK_THEME, TV_LIGHT_THEME } from '../chart/klineConfig';
import { 
  registerFootprintIndicator, 
  FOOTPRINT_INDICATOR_NAME,
  registerDeltaIndicator,
  DELTA_INDICATOR_NAME,
  registerHeatmapIndicator,
  HEATMAP_INDICATOR_NAME,
  setHeatmapDepthData
} from '../chart/footprintIndicator';
import { activateDrawingTool } from '../chart/drawingTools';

export function ChartContainer({
  chartMode,
  activeTool,
  onChartReady,
  optionsData,
  subIndicator = 'DELTA', // 'DELTA' or 'VOL'
  depthData,
  theme = 'dark',
}) {
  const containerRef = useRef(null);
  const chartInstance = useRef(null);
  const isFootprintActiveRef = useRef(false);
  const isHeatmapActiveRef = useRef(false);
  const subPaneIdRef = useRef(null);
  const currentSubIndicatorRef = useRef(subIndicator);

  // Sync depthData with heatmap drawer
  useEffect(() => {
    setHeatmapDepthData(depthData);
  }, [depthData]);

  useEffect(() => {
    if (!containerRef.current) return;

    registerFootprintIndicator();
    registerDeltaIndicator();
    registerHeatmapIndicator();

    const chart = init(containerRef.current, {
      styles: theme === 'light' ? TV_LIGHT_THEME : TV_DARK_THEME,
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

    try {
      chart.setBarSpace(chartMode === 'FOOTPRINT' ? 55 : 12);
    } catch (e) {}

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

  // Handle Theme Change
  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart) return;
    chart.setStyles(theme === 'light' ? TV_LIGHT_THEME : TV_DARK_THEME);
  }, [theme]);

  // Handle Chart Mode: CANDLE vs FOOTPRINT vs HEATMAP
  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart) return;

    if (chartMode === 'FOOTPRINT') {
      // Deactivate heatmap if active
      if (isHeatmapActiveRef.current) {
        try {
          chart.removeIndicator('candle_pane', HEATMAP_INDICATOR_NAME);
          isHeatmapActiveRef.current = false;
        } catch (e) {}
      }

      // Transparent candle outline to let footprint bricks shine
      chart.setStyles({
        candle: {
          type: 'candle_solid',
          bar: {
            upColor: 'rgba(34, 171, 148, 0.08)',
            downColor: 'rgba(242, 54, 69, 0.08)',
            upBorderColor: 'rgba(34, 171, 148, 0.3)',
            downBorderColor: 'rgba(242, 54, 69, 0.3)',
            upWickColor: 'rgba(34, 171, 148, 0.3)',
            downWickColor: 'rgba(242, 54, 69, 0.3)',
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

    } else if (chartMode === 'HEATMAP') {
      // Deactivate footprint if active
      if (isFootprintActiveRef.current) {
        try {
          chart.removeIndicator('candle_pane', FOOTPRINT_INDICATOR_NAME);
          isFootprintActiveRef.current = false;
        } catch (e) {}
      }

      // Activate Liquidity Heatmap
      if (!isHeatmapActiveRef.current) {
        try {
          chart.createIndicator(HEATMAP_INDICATOR_NAME, true, { id: 'candle_pane' });
          isHeatmapActiveRef.current = true;
        } catch (err) {
          console.warn('Error creating heatmap indicator:', err);
        }
      }

      // Normal candles on top of heatmap
      chart.setStyles({
        candle: {
          type: 'candle_solid',
          bar: {
            upColor: '#22ab94',
            downColor: '#f23645',
            upBorderColor: '#22ab94',
            downBorderColor: '#f23645',
            upWickColor: '#22ab94',
            downWickColor: '#f23645',
          }
        }
      });

      try {
        chart.setBarSpace(16);
      } catch (e) {}

    } else {
      // CANDLE Mode
      if (isFootprintActiveRef.current) {
        try {
          chart.removeIndicator('candle_pane', FOOTPRINT_INDICATOR_NAME);
          isFootprintActiveRef.current = false;
        } catch (e) {}
      }
      if (isHeatmapActiveRef.current) {
        try {
          chart.removeIndicator('candle_pane', HEATMAP_INDICATOR_NAME);
          isHeatmapActiveRef.current = false;
        } catch (e) {}
      }

      chart.setStyles({
        candle: {
          type: 'candle_solid',
          bar: {
            upColor: '#22ab94',
            downColor: '#f23645',
            upBorderColor: '#22ab94',
            downBorderColor: '#f23645',
            upWickColor: '#22ab94',
            downWickColor: '#f23645',
          }
        }
      });

      try {
        chart.setBarSpace(12);
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

  const bgColor = theme === 'light' ? '#ffffff' : '#131722';

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: bgColor }}>
      <div 
        ref={containerRef} 
        className="h-full w-full"
        style={{ background: bgColor }}
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
