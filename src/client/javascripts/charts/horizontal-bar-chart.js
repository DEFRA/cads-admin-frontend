import { axisBottom, axisLeft, max, scaleBand, scaleLinear } from 'd3'

import { chartWidth, createChartFrame } from './chart-frame.js'
import { formatTick, formatValue, truncate } from './format.js'
import { axisColour, seriesColour } from './palette.js'

const labelLength = 28
const rowHeight = 28

/**
 * Horizontal bar chart for a single series of ranked items, e.g. the
 * longest running queries or the largest tables.
 *
 * @param {HTMLElement} figure
 * @param {{ label: string, maxValue: number | null, categories: string[], series: { name: string, values: number[] }[] }} chart
 */
export function renderHorizontalBarChart(figure, chart) {
  const [series] = chart.series

  const { svg, plot, innerWidth, innerHeight } = createChartFrame(
    figure,
    chart,
    {
      width: chartWidth(figure, 720),
      height: Math.max(chart.categories.length * rowHeight, 80) + 45,
      margin: { top: 10, right: 30, bottom: 35, left: 210 }
    }
  )

  // Bars are keyed by position, so two rows with the same label, such as
  // two queries from one application, still get their own bars
  const keys = chart.categories.map((_, index) => index)

  const y = scaleBand().domain(keys).range([0, innerHeight]).padding(0.25)

  const x = scaleLinear()
    .domain([0, chart.maxValue ?? (max(series.values) || 1)])
    .nice()
    .range([0, innerWidth])

  plot
    .append('g')
    .attr('class', 'app-chart__axis')
    .call(
      axisLeft(y).tickFormat((index) =>
        truncate(chart.categories[index], labelLength)
      )
    )
    .selectAll('.tick text')
    .append('title')
    .text((index) => chart.categories[index])

  plot
    .append('g')
    .attr('class', 'app-chart__axis')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(axisBottom(x).ticks(5).tickFormat(formatTick))

  plot
    .append('g')
    .selectAll('rect')
    .data(keys)
    .join('rect')
    .attr('class', 'app-chart__bar')
    .attr('x', 0)
    .attr('y', (index) => y(index))
    .attr('width', (index) => x(series.values[index]))
    .attr('height', y.bandwidth())
    .attr('fill', seriesColour(0))
    .append('title')
    .text(
      (index) =>
        `${chart.categories[index]}: ${formatValue(series.values[index])} ${series.name.toLowerCase()}`
    )

  svg.selectAll('.domain, .tick line').attr('stroke', axisColour)
}
