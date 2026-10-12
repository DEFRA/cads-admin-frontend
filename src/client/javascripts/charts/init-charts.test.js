// @vitest-environment jsdom
import { initCharts, renderChart } from './init-charts.js'
import { describeChart } from './chart-frame.js'
import { formatTick, truncate } from './format.js'
import { chartColours } from './palette.js'

const barChart = {
  type: 'bar',
  label: 'Bar chart showing the number of sessions in each state',
  maxValue: null,
  categories: ['active', 'idle', 'idle in transaction'],
  series: [{ name: 'Sessions', values: [12, 48, 3] }]
}

const horizontalBarChart = {
  type: 'horizontal-bar',
  label: 'Horizontal bar chart showing the longest running queries',
  maxValue: null,
  categories: [
    'PID 45231 / Import Service with a very long application name',
    'PID 45288 / Portal',
    'PID 45288 / Portal'
  ],
  series: [{ name: 'Duration (seconds)', values: [1824, 318, 12] }]
}

const groupedBarChart = {
  type: 'grouped-bar',
  label: 'Grouped bar chart showing commits and rollbacks for each database',
  maxValue: null,
  categories: ['cads', 'cts'],
  series: [
    { name: 'Commits', values: [12568234, 8421178] },
    { name: 'Rollbacks', values: [1834, 812] }
  ]
}

function figureFor(chart) {
  const figure = document.createElement('figure')
  figure.dataset.module = 'app-chart'
  figure.dataset.chart = JSON.stringify(chart)
  document.body.append(figure)
  return figure
}

describe('charts', () => {
  let consoleSpies

  beforeEach(() => {
    document.body.replaceChildren()
    consoleSpies = ['log', 'info', 'warn', 'error', 'debug'].map((method) =>
      vi.spyOn(console, method)
    )
  })

  afterEach(() => {
    // Monitoring data must never be logged to the browser console
    for (const spy of consoleSpies) {
      expect(spy).not.toHaveBeenCalled()
    }
  })

  describe('accessible SVG', () => {
    test.each([
      ['bar', barChart],
      ['horizontal-bar', horizontalBarChart],
      ['grouped-bar', groupedBarChart]
    ])(
      'Should give the %s chart an image role, label, title and description',
      (_, chart) => {
        const figure = figureFor(chart)

        expect(renderChart(figure)).toBe(true)

        const svg = figure.querySelector('svg')
        expect(svg.getAttribute('role')).toBe('img')
        expect(svg.getAttribute('aria-label')).toBe(chart.label)
        expect(svg.querySelector('title').textContent).toBe(chart.label)

        const desc = svg.querySelector('desc')
        expect(svg.getAttribute('aria-describedby')).toBe(desc.id)
        expect(desc.textContent).toBe(describeChart(chart))
        expect(svg.getAttribute('viewBox')).toMatch(/^0 0 \d+ \d+$/)
      }
    )
  })

  describe('bar chart', () => {
    test('Should draw one bar per category, tallest for the highest value', () => {
      const figure = figureFor(barChart)
      renderChart(figure)

      const bars = [...figure.querySelectorAll('rect.app-chart__bar')]
      expect(bars).toHaveLength(3)

      const heights = bars.map((bar) => Number(bar.getAttribute('height')))
      expect(Math.max(...heights)).toBe(heights[1])
      expect(bars[0].getAttribute('fill')).toBe(chartColours[0])
      expect(bars[1].querySelector('title').textContent).toBe(
        'idle: 48 sessions'
      )
    })

    test('Should fix the axis to the maximum value when given', () => {
      const figure = figureFor({
        ...barChart,
        maxValue: 100,
        series: [{ name: 'Hit ratio', values: [50, 25, 10] }]
      })
      renderChart(figure)

      const ticks = [...figure.querySelectorAll('.tick text')].map(
        (tick) => tick.textContent
      )
      expect(ticks).toContain('100')
    })
  })

  describe('horizontal bar chart', () => {
    test('Should draw a bar per row, even when labels repeat', () => {
      const figure = figureFor(horizontalBarChart)
      renderChart(figure)

      const bars = [...figure.querySelectorAll('rect.app-chart__bar')]
      expect(bars).toHaveLength(3)

      const widths = bars.map((bar) => Number(bar.getAttribute('width')))
      expect(widths[0]).toBeGreaterThan(widths[1])
      expect(widths[1]).toBeGreaterThan(widths[2])
    })

    test('Should shorten long labels and keep the full text in a tooltip', () => {
      const figure = figureFor(horizontalBarChart)
      renderChart(figure)

      const label = figure.querySelector('.tick text')
      expect(label.textContent).toContain('…')
      expect(label.querySelector('title').textContent).toBe(
        horizontalBarChart.categories[0]
      )
    })
  })

  describe('grouped bar chart', () => {
    test('Should draw a bar for each series in each category, with a key', () => {
      const figure = figureFor(groupedBarChart)
      renderChart(figure)

      const bars = [...figure.querySelectorAll('rect.app-chart__bar')]
      expect(bars).toHaveLength(4)
      expect(bars.map((bar) => bar.getAttribute('fill'))).toEqual([
        chartColours[0],
        chartColours[1],
        chartColours[0],
        chartColours[1]
      ])

      expect(
        [...figure.querySelectorAll('.app-chart__legend-item')].map(
          (item) => item.textContent
        )
      ).toEqual(['Commits', 'Rollbacks'])
      expect(
        figure.querySelector('.app-chart__legend-swatch').style.backgroundColor
      ).toBe('rgb(29, 112, 184)')
    })
  })

  describe('#renderChart', () => {
    test.each([
      ['invalid JSON', '{not json'],
      ['an unknown chart type', JSON.stringify({ ...barChart, type: 'pie' })],
      ['no categories', JSON.stringify({ ...barChart, categories: [] })]
    ])('Should leave the figure empty for %s', (_, data) => {
      const figure = document.createElement('figure')
      figure.dataset.chart = data

      expect(renderChart(figure)).toBe(false)
      expect(figure.children).toHaveLength(0)
    })

    test('Should replace anything already in the figure', () => {
      const figure = figureFor(barChart)
      renderChart(figure)
      renderChart(figure)

      expect(figure.querySelectorAll('svg')).toHaveLength(1)
    })
  })

  describe('#initCharts', () => {
    test('Should draw every chart on the page', () => {
      figureFor(barChart)
      figureFor(groupedBarChart)

      initCharts(document)

      expect(document.querySelectorAll('figure svg')).toHaveLength(2)
    })
  })
})

describe('#formatTick', () => {
  test.each([
    [0, '0'],
    [250, '250'],
    [12000, '12k'],
    [1500000, '1.5M'],
    [2000000000, '2B']
  ])('Should format %d as %s', (value, text) => {
    expect(formatTick(value)).toBe(text)
  })
})

describe('#truncate', () => {
  test('Should shorten text longer than the limit', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…')
    expect(truncate('abc', 5)).toBe('abc')
  })
})

describe('#describeChart', () => {
  test('Should summarise the size of the chart and the highest value', () => {
    expect(describeChart(barChart)).toBe('3 items. Highest sessions: idle, 48.')
  })
})
