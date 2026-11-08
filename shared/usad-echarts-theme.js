/* shared/usad-echarts-theme.js — the USA Diving brand theme for Apache ECharts.
   Rules from DESIGN.md: Pool for the main series, Navy for the comparison,
   Sky for bands, Red only for a threshold line, mono tabular axes.
   Usage: echarts.init(el, 'usad') after this file and echarts.min.js load.
   USAD.charts.* holds the helpers every app chart uses (threshold line,
   provenance caption, PNG download, resize-on-container). */
(function () {
  'use strict';
  const C = {
    navy: '#171f69', navy700: '#1e2d8a', red: '#e31937', pool: '#009ac7', sky: '#8fc3ea',
    ink: '#0d1117', ink2: '#2d3a4a', ink3: '#5a6a7e', ink4: '#94a3b8', line: '#e2e5ef', line2: '#f0f2f8',
    good: '#059669', warn: '#d97706',
  };
  const MONO = "'JetBrains Mono', Consolas, monospace";
  const UI = "'Inter', system-ui, sans-serif";

  const theme = {
    color: [C.pool, C.navy, C.sky, C.good, C.warn, C.ink3],
    backgroundColor: 'transparent',
    textStyle: { fontFamily: UI, color: C.ink2 },
    title: { textStyle: { fontFamily: UI, fontSize: 13, fontWeight: 600, color: C.ink }, subtextStyle: { fontFamily: UI, fontSize: 11.5, color: C.ink3 } },
    legend: { textStyle: { fontFamily: UI, fontSize: 11.5, color: C.ink2 }, itemWidth: 12, itemHeight: 8, icon: 'roundRect' },
    grid: { left: 48, right: 20, top: 28, bottom: 36, containLabel: false },
    categoryAxis: {
      axisLine: { lineStyle: { color: C.line } }, axisTick: { show: false },
      axisLabel: { fontFamily: MONO, fontSize: 11, color: C.ink3 },
      splitLine: { show: false },
    },
    valueAxis: {
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { fontFamily: MONO, fontSize: 11, color: C.ink3 },
      splitLine: { lineStyle: { color: C.line2 } },
      nameTextStyle: { fontFamily: UI, fontSize: 11, color: C.ink4 },
    },
    tooltip: {
      backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, padding: [8, 10],
      textStyle: { fontFamily: UI, fontSize: 12, color: C.ink2 },
      extraCssText: 'box-shadow:0 4px 16px rgba(0,0,0,.10);border-radius:8px;',
    },
    line: { symbolSize: 5, smooth: false, lineStyle: { width: 2 } },
    bar: { itemStyle: { borderRadius: [3, 3, 0, 0] }, barMaxWidth: 28 },
    scatter: { symbolSize: 8 },
    heatmap: { itemStyle: { borderColor: '#fff', borderWidth: 1 } },
    boxplot: { itemStyle: { color: 'rgba(143,195,234,.35)', borderColor: C.navy, borderWidth: 1.5 } },
    visualMap: { textStyle: { fontFamily: MONO, fontSize: 10.5, color: C.ink3 }, inRange: { color: ['#eaf6fb', '#8fc3ea', '#009ac7', '#1e2d8a', '#171f69'] } },
    dataZoom: { borderColor: C.line, fillerColor: 'rgba(0,154,199,.12)', handleStyle: { color: C.navy }, textStyle: { fontFamily: MONO, fontSize: 10.5, color: C.ink3 }, dataBackground: { lineStyle: { color: C.sky }, areaStyle: { color: 'rgba(143,195,234,.25)' } } },
    markLine: { lineStyle: { color: C.red, width: 1.5, type: 'solid' }, label: { fontFamily: MONO, fontSize: 11, color: C.red } },
  };
  if (window.echarts) window.echarts.registerTheme('usad', theme);

  // A threshold line: red, labelled, full height. The one red element on a chart.
  function thresholdLine(x, label, opts = {}) {
    return {
      silent: true, symbol: 'none', animation: false,
      lineStyle: { color: opts.color || C.red, width: 1.5, type: opts.dashed ? [4, 4] : 'solid' },
      label: { show: true, formatter: label, position: opts.position || 'insideEndTop', fontFamily: MONO, fontSize: 11, color: opts.color || C.red, backgroundColor: 'rgba(255,255,255,.85)', padding: [2, 4], borderRadius: 3 },
      data: [{ xAxis: x }],
    };
  }
  // A reference line in Navy (comparison), dashed.
  function referenceLine(x, label) { return thresholdLine(x, label, { color: C.navy, dashed: true, position: 'insideEndBottom' }); }

  // Mount: init with the theme, resize with the container, add a download control.
  function mount(el, option, opts = {}) {
    const chart = window.echarts.init(el, 'usad', { renderer: 'canvas' });
    chart.setOption(option);
    if (window.ResizeObserver) new ResizeObserver(() => chart.resize()).observe(el);
    if (opts.download !== false) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'usad-chart-dl'; btn.title = 'Download this chart as a PNG';
      btn.textContent = 'PNG';
      btn.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = chart.getDataURL({ pixelRatio: 2, backgroundColor: '#fff' });
        a.download = (opts.filename || 'chart') + '.png'; a.click();
      });
      el.style.position = el.style.position || 'relative';
      el.appendChild(btn);
    }
    return chart;
  }

  window.USAD = window.USAD || {};
  window.USAD.charts = { theme, colors: C, MONO, UI, thresholdLine, referenceLine, mount };
})();
