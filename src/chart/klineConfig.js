/**
 * TradingView Dark & Light Theme Style Configurations for KLineCharts v10
 */
export const TV_DARK_THEME = {
  grid: {
    show: true,
    horizontal: {
      show: true,
      size: 1,
      color: '#1f2430',
      style: 'dash',
      dashedValue: [2, 2],
    },
    vertical: {
      show: true,
      size: 1,
      color: '#1f2430',
      style: 'dash',
      dashedValue: [2, 2],
    },
  },
  candle: {
    type: 'candle_solid',
    bar: {
      upColor: '#089981',
      downColor: '#f23645',
      noChangeColor: '#888888',
      upBorderColor: '#089981',
      downBorderColor: '#f23645',
      noChangeBorderColor: '#888888',
      upWickColor: '#089981',
      downWickColor: '#f23645',
      noChangeWickColor: '#888888',
    },
    priceMark: {
      show: true,
      high: { show: true, color: '#787b86', textOffset: 5, textSize: 10 },
      low: { show: true, color: '#787b86', textOffset: 5, textSize: 10 },
      last: {
        show: true,
        upColor: '#089981',
        downColor: '#f23645',
        noChangeColor: '#888888',
        line: { show: true, style: 'dash', dashedValue: [4, 4], size: 1 },
        text: { show: true, size: 11, color: '#ffffff', paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, borderRadius: 2 },
      },
    },
  },
  xAxis: {
    show: true,
    size: 20,
    axisLine: { show: true, color: '#2a2e39', size: 1 },
    tickText: { show: true, color: '#787b86', size: 10 },
    tickLine: { show: true, size: 1, length: 3, color: '#2a2e39' },
  },
  yAxis: {
    show: true,
    size: 65,
    position: 'right',
    type: 'normal',
    axisLine: { show: true, color: '#2a2e39', size: 1 },
    tickText: { show: true, color: '#787b86', size: 10 },
    tickLine: { show: true, size: 1, length: 3, color: '#2a2e39' },
  },
  crosshair: {
    show: true,
    horizontal: {
      show: true,
      line: { style: 'dash', dashedValue: [3, 3], size: 1, color: '#787b86' },
      text: { show: true, color: '#ffffff', size: 11, backgroundColor: '#2a2e39' },
    },
    vertical: {
      show: true,
      line: { style: 'dash', dashedValue: [3, 3], size: 1, color: '#787b86' },
      text: { show: true, color: '#ffffff', size: 11, backgroundColor: '#2a2e39' },
    },
  },
  separator: {
    size: 1,
    color: '#2a2e39',
  },
};

export const TV_LIGHT_THEME = {
  grid: {
    show: true,
    horizontal: {
      show: true,
      size: 1,
      color: '#f0f3fa',
      style: 'dash',
      dashedValue: [2, 2],
    },
    vertical: {
      show: true,
      size: 1,
      color: '#f0f3fa',
      style: 'dash',
      dashedValue: [2, 2],
    },
  },
  candle: {
    type: 'candle_solid',
    bar: {
      upColor: '#22ab94',
      downColor: '#f23645',
      noChangeColor: '#888888',
      upBorderColor: '#22ab94',
      downBorderColor: '#f23645',
      noChangeBorderColor: '#888888',
      upWickColor: '#22ab94',
      downWickColor: '#f23645',
      noChangeWickColor: '#888888',
    },
    priceMark: {
      show: true,
      high: { show: true, color: '#787b86', textOffset: 5, textSize: 10 },
      low: { show: true, color: '#787b86', textOffset: 5, textSize: 10 },
      last: {
        show: true,
        upColor: '#22ab94',
        downColor: '#f23645',
        noChangeColor: '#888888',
        line: { show: true, style: 'dash', dashedValue: [4, 4], size: 1 },
        text: { show: true, size: 11, color: '#ffffff', paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, borderRadius: 2 },
      },
    },
  },
  xAxis: {
    show: true,
    size: 20,
    axisLine: { show: true, color: '#e0e3eb', size: 1 },
    tickText: { show: true, color: '#5d606b', size: 10 },
    tickLine: { show: true, size: 1, length: 3, color: '#e0e3eb' },
  },
  yAxis: {
    show: true,
    size: 65,
    position: 'right',
    type: 'normal',
    axisLine: { show: true, color: '#e0e3eb', size: 1 },
    tickText: { show: true, color: '#5d606b', size: 10 },
    tickLine: { show: true, size: 1, length: 3, color: '#e0e3eb' },
  },
  crosshair: {
    show: true,
    horizontal: {
      show: true,
      line: { style: 'dash', dashedValue: [3, 3], size: 1, color: '#9598a1' },
      text: { show: true, color: '#ffffff', size: 11, backgroundColor: '#2a2e39' },
    },
    vertical: {
      show: true,
      line: { style: 'dash', dashedValue: [3, 3], size: 1, color: '#9598a1' },
      text: { show: true, color: '#ffffff', size: 11, backgroundColor: '#2a2e39' },
    },
  },
  separator: {
    size: 1,
    color: '#e0e3eb',
  },
};
