import { axisBottom, axisLeft, max, scaleBand, scaleLinear } from 'd3'

import { appendLegend, chartWidth, createChartFrame } from './chart-frame.js'
import { formatTick, formatValue, truncate } from './format.js'
import { axisColour, seriesColour } from './palette.js'

/**
 * Grouped bar chart comparing several series per category, e.g. commits
 * and rollbacks per database.
 *
 * @param {HTMLElement} figure
 * @param {{ label: string, maxValue: number | null, categories: string[], series: { name: string, values: number[] }[] }} chart
 */
export function renderGroupedBarChart(figure, chart) {
  const longLabels = chart.categories.some((category) => category.length > 12)

  const { svg, plot, innerWidth, innerHeight } = createChartFrame(
    figure,
    chart,
    {
      width: chartWidth(figure, 720),
      height: 300,
      margin: { top: 10, right: 20, bottom: longLabels ? 90 : 45, left: 70 }
    }
  )

  const x0 = scaleBand()
    .domain(chart.categories.map((_, index) => index))
    .range([0, innerWidth])
    .padding(0.25)

  const x1 = scaleBand()
    .domain(chart.series.map((_, index) => index))
    .range([0, x0.bandwidth()])
    .padding(0.1)

  const highest = max(chart.series, (series) => max(series.values))
  const y = scaleLinear()
    .domain([0, chart.maxValue ?? (highest || 1)])
    .nice()
    .range([innerHeight, 0])

  const xAxis = plot
    .append('g')
    .attr('class', 'app-chart__axis')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(
      axisBottom(x0).tickFormat((index) =>
        truncate(chart.categories[index], 20)
      )
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
    .selectAll('g')
    .data(chart.categories)
    .join('g')
    .attr('transform', (_, index) => `translate(${x0(index)},0)`)
    .selectAll('rect')
    .data((category, categoryIndex) =>
      chart.series.map((series, seriesIndex) => ({
        category,
        seriesIndex,
        name: series.name,
        value: series.values[categoryIndex]
      }))
    )
    .join('rect')
    .attr('class', 'app-chart__bar')
    .attr('x', (bar) => x1(bar.seriesIndex))
    .attr('y', (bar) => y(bar.value))
    .attr('width', x1.bandwidth())
    .attr('height', (bar) => innerHeight - y(bar.value))
    .attr('fill', (bar) => seriesColour(bar.seriesIndex))
    .append('title')
    .text(
      (bar) =>
        `${bar.category}, ${bar.name.toLowerCase()}: ${formatValue(bar.value)}`
    )

  svg.selectAll('.domain, .tick line').attr('stroke', axisColour)

  appendLegend(figure, chart.series, seriesColour)
}
