/**
 * TradingView Drawing Tools Interface for KLineCharts
 */

export const DRAWING_TOOLS = [
  { id: 'crosshair', name: 'Crosshair', icon: 'Crosshair', type: 'cursor' },
  { id: 'segment', name: 'Trendline', icon: 'TrendingUp', overlay: 'segment' },
  { id: 'rayLine', name: 'Ray', icon: 'ArrowUpRight', overlay: 'rayLine' },
  { id: 'horizontalRayLine', name: 'Horizontal Ray', icon: 'Minus', overlay: 'horizontalRayLine' },
  { id: 'horizontalStraightLine', name: 'Horizontal Line', icon: 'MoveHorizontal', overlay: 'horizontalStraightLine' },
  { id: 'fibonacciLine', name: 'Fibonacci Retracement', icon: 'Percent', overlay: 'fibonacciLine' },
  { id: 'priceLine', name: 'Price Level', icon: 'Tag', overlay: 'priceLine' },
  { id: 'parallelStraightLine', name: 'Parallel Channel', icon: 'Columns', overlay: 'parallelStraightLine' },
  { id: 'brush', name: 'Brush', icon: 'Pencil', overlay: 'brush' },
  { id: 'simpleAnnotation', name: 'Text Note', icon: 'Type', overlay: 'simpleAnnotation' },
];

/**
 * Activate a drawing tool on the chart instance
 */
export function activateDrawingTool(chart, toolId) {
  if (!chart) return;

  if (toolId === 'crosshair') {
    chart.setStyles({ crosshair: { show: true } });
    return;
  }

  const tool = DRAWING_TOOLS.find(t => t.id === toolId);
  if (tool && tool.overlay) {
    chart.createOverlay({
      name: tool.overlay,
      styles: {
        line: {
          color: '#2962ff',
          size: 1.5,
        },
        point: {
          backgroundColor: '#2962ff',
          borderColor: '#ffffff',
          borderSize: 1,
          radius: 4,
          activeRadius: 6,
        },
        text: {
          color: '#d1d4dc',
          size: 11,
        }
      }
    });
  }
}

/**
 * Remove all drawing overlays from the chart
 */
export function clearAllDrawings(chart) {
  if (!chart) return;
  try {
    chart.removeOverlay();
  } catch (err) {
    console.warn('Error clearing overlays:', err);
  }
}
