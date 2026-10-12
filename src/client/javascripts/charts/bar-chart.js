import { axisBottom, axisLeft, max, scaleBand, scaleLinear } from 'd3'

import { chartWidth, createChartFrame } from './chart-frame.js'
import { formatTick, formatValue, truncate } from './format.js'
import { axisColour, seriesColour } from './palette.js'

/**
 * Vertical bar chart for a single series, e.g. sessions by state.
 *
 * @param {HTMLElement} figure
 * @param {{ label: string, maxValue: number | null, categories: string[], series: { name: string, values: number[] }[] }} chart
 */
export function renderBarChart(figure, chart) {
  const [series] = chart.series
  const longLabels = chart.categories.some((category) => category.length > 10)

  const { svg, plot, innerWidth, innerHeight } = createChartFrame(
    figure,
    chart,
    {
      width: chartWidth(figure, 520),
      height: 260,
      margin: { top: 10, right: 20, bottom: longLabels ? 80 : 40, left: 60 }
    }
  )

  // Bars are keyed by position, so two categories with the same label still
  // get their own bars
  const keys = chart.categories.map((_, index) => index)

  const x = scaleBand().domain(keys).range([0, innerWidth]).padding(0.35)

  const y = scaleLinear()
    .domain([0, chart.maxValue ?? (max(series.values) || 1)])
    .nice()
    .range([innerHeight, 0])

  const xAxis = plot
    .append('g')
    .attr('class', 'app-chart__axis')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(
      axisBottom(x).tickFormat((index) => truncate(chart.categories[index], 18))
    )

  if (longLabels) {
    xAxis
      .selectAll('text')
      .attr('text-anchor', 'end')
      .attr('transform', 'rotate(-35)')
      .attr('dx', '-0.5em')
      .attr('dy', '0.5em')
  }

  plot
    .append('g')
    .attr('class', 'app-chart__axis')
    .call(axisLeft(y).ticks(5).tickFormat(formatTick))

  plot
    .append('g')
    .selectAll('rect')
    .data(keys)
    .join('rect')
    .attr('class', 'app-chart__bar')
    .attr('x', (index) => x(index))
    .attr('y', (index) => y(series.values[index]))
    .attr('width', x.bandwidth())
    .attr('height', (index) => innerHeight - y(series.values[index]))
    .attr('fill', seriesColour(0))
    .append('title')
    .text(
      (index) =>
        `${chart.categories[index]}: ${formatValue(series.values[index])} ${series.name.toLowerCase()}`
    )

  svg.selectAll('.domain, .tick line').attr('stroke', axisColour)
}
