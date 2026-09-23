/**
 * TradingView Dark Theme Style Configuration for KLineCharts v10
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
    area: {
      lineSize: 2,
      lineColor: '#2962ff',
      value: 'close',
      backgroundColor: [{
        offset: 0,
        color: 'rgba(41, 98, 255, 0.01)'
      }, {
        offset: 1,
        color: 'rgba(41, 98, 255, 0.28)'
      }]
    },
    priceMark: {
      show: true,
      high: {
        show: true,
        color: '#787b86',
        textOffset: 5,
        textSize: 10,
      },
      low: {
        show: true,
        color: '#787b86',
        textOffset: 5,
        textSize: 10,
      },
      last: {
        show: true,
        upColor: '#089981',
        downColor: '#f23645',
        noChangeColor: '#888888',
        line: {
          show: true,
          style: 'dash',
          dashedValue: [4, 4],
          size: 1,
        },
        text: {
          show: true,
          style: 'fill',
          size: 12,
          paddingLeft: 4,
          paddingTop: 4,
          paddingRight: 4,
          paddingBottom: 4,
          borderColor: 'transparent',
          borderRadius: 2,
          color: '#ffffff',
        },
      },
    },
    tooltip: {
      showRule: 'always',
      showType: 'standard',
      custom: (data) => {
        if (!data || !data.current) return [];
        const c = data.current;
        const change = c.close - c.open;
        const changePct = ((change / c.open) * 100).toFixed(2);
        const isUp = change >= 0;
        const color = isUp ? '#089981' : '#f23645';
        
        const items = [
          { title: 'O', value: c.open?.toFixed(2) ?? '--', color },
          { title: 'H', value: c.high?.toFixed(2) ?? '--', color },
          { title: 'L', value: c.low?.toFixed(2) ?? '--', color },
          { title: 'C', value: c.close?.toFixed(2) ?? '--', color },
          { 
            title: 'Chg', 
            value: `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${change >= 0 ? '+' : ''}${changePct}%)`, 
            color 
          },
          { title: 'Vol', value: c.volume?.toFixed(3) ?? '--', color: '#787b86' },
        ];

        // If footprint cluster data exists on candle, display Delta & Cumulative Delta in header tooltip!
        if (c.footprint) {
          const delta = c.footprint.delta || 0;
          const deltaColor = delta > 0 ? '#089981' : delta < 0 ? '#f23645' : '#787b86';
          items.push({
            title: 'Delta',
            value: `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`,
            color: deltaColor,
          });
          if (c.footprint.pocPrice) {
            items.push({
              title: 'POC',
              value: `${c.footprint.pocPrice.toFixed(2)}`,
              color: '#ffb703',
            });
          }
        }
        return items;
      },
      defaultValue: 'n/a',
      rect: {
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 6,
        paddingBottom: 6,
        offsetLeft: 8,
        offsetTop: 8,
        borderRadius: 4,
        borderSize: 1,
        borderColor: '#2a2e39',
        color: 'rgba(19, 23, 34, 0.85)',
      },
      text: {
        size: 11,
        family: '"Trebuchet MS", Roboto, sans-serif',
        color: '#d1d4dc',
        marginLeft: 8,
        marginTop: 4,
        marginRight: 8,
        marginBottom: 4,
      },
    },
  },
  indicator: {
    tooltip: {
      showRule: 'always',
      showType: 'standard',
    },
  },
  xAxis: {
    show: true,
    size: 'auto',
    axisLine: {
      show: true,
      color: '#2a2e39',
      size: 1,
    },
    tickText: {
      show: true,
      color: '#787b86',
      family: '"Trebuchet MS", Roboto, sans-serif',
      size: 11,
      marginStart: 4,
      marginEnd: 4,
    },
    tickLine: {
      show: true,
      size: 1,
      length: 3,
      color: '#2a2e39',
    },
  },
  yAxis: {
    show: true,
    size: 'auto',
    position: 'right',
    type: 'normal',
    inside: false,
    axisLine: {
      show: true,
      color: '#2a2e39',
      size: 1,
    },
    tickText: {
      show: true,
      color: '#787b86',
      family: '"Trebuchet MS", Roboto, sans-serif',
      size: 11,
      marginStart: 4,
      marginEnd: 4,
    },
    tickLine: {
      show: true,
      size: 1,
      length: 3,
      color: '#2a2e39',
    },
  },
  crosshair: {
    show: true,
    horizontal: {
      show: true,
      line: {
        show: true,
        style: 'dash',
        dashedValue: [3, 3],
        size: 1,
        color: '#787b86',
      },
      text: {
        show: true,
        style: 'fill',
        color: '#ffffff',
        size: 11,
        family: '"Trebuchet MS", Roboto, sans-serif',
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 3,
        paddingBottom: 3,
        borderSize: 1,
        borderColor: '#363a45',
        borderRadius: 2,
        backgroundColor: '#2a2e39',
      },
    },
    vertical: {
      show: true,
      line: {
        show: true,
        style: 'dash',
        dashedValue: [3, 3],
        size: 1,
        color: '#787b86',
      },
      text: {
        show: true,
        style: 'fill',
        color: '#ffffff',
        size: 11,
        family: '"Trebuchet MS", Roboto, sans-serif',
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 3,
        paddingBottom: 3,
        borderSize: 1,
        borderColor: '#363a45',
        borderRadius: 2,
        backgroundColor: '#2a2e39',
      },
    },
  },
  separator: {
    size: 1,
    color: '#2a2e39',
    fill: true,
    activeBackgroundColor: 'rgba(41, 98, 255, 0.1)',
  },
};
