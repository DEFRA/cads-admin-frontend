import { select } from 'd3'

import { formatValue } from './format.js'

const svgNamespace = 'http://www.w3.org/2000/svg'

// Below this, the axis labels no longer fit
const minimumWidth = 280

let frameCount = 0

/**
 * A short text summary of the chart for assistive technology. The full data
 * is in the data table next to the chart.
 *
 * @param {{ categories: string[], series: { name: string, values: number[] }[] }} chart
 */
export function describeChart(chart) {
  const count = chart.categories.length
  const parts = [`${count} ${count === 1 ? 'item' : 'items'}.`]

  for (const series of chart.series) {
    let highest = 0
    series.values.forEach((value, index) => {
      if (value > series.values[highest]) {
        highest = index
      }
    })
    if (count) {
      parts.push(
        `Highest ${series.name.toLowerCase()}: ${chart.categories[highest]}, ${formatValue(series.values[highest])}.`
      )
    }
  }

  return parts.join(' ')
}

/**
 * Creates the SVG for a chart inside its figure element, sized by a viewBox
 * so it scales with its column.
 *
 * @param {HTMLElement} figure
 * @param {{ label: string, categories: string[], series: { name: string, values: number[] }[] }} chart
 * @param {{ width: number, height: number, margin: { top: number, right: number, bottom: number, left: number } }} size
 */
export function createChartFrame(figure, chart, size) {
  const { width, height, margin } = size
  frameCount += 1
  const id = `app-chart-${frameCount}`

  const svg = select(figure)
    .append('svg')
    .attr('xmlns', svgNamespace)
    .attr('class', 'app-chart__svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMinYMin meet')
    .attr('role', 'img')
    .attr('aria-label', chart.label)
    .attr('aria-describedby', `${id}-desc`)
    .attr('focusable', 'false')

  svg.append('title').attr('id', `${id}-title`).text(chart.label)
  svg.append('desc').attr('id', `${id}-desc`).text(describeChart(chart))

  const plot = svg
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  return {
    svg,
    plot,
    innerWidth: width - margin.left - margin.right,
    innerHeight: height - margin.top - margin.bottom
  }
}

/**
 * The width to draw at: the figure's own width when it has been laid out,
 * so text is not scaled down, otherwise a default.
 *
 * @param {HTMLElement} figure
 * @param {number} fallback
 */
export function chartWidth(figure, fallback) {
  return Math.max(figure.clientWidth || fallback, minimumWidth)
}

/**
 * An HTML key for charts with more than one series.
 *
 * @param {HTMLElement} figure
 * @param {{ name: string }[]} series
 * @param {(index: number) => string} colour
 */
export function appendLegend(figure, series, colour) {
  const list = select(figure)
    .append('ul')
    .attr('class', 'app-chart__legend')
    .attr('aria-hidden', 'true')

  series.forEach((item, index) => {
    const entry = list.append('li').attr('class', 'app-chart__legend-item')
    // Set through the CSSOM, which the content security policy allows
    entry
      .append('span')
      .attr('class', 'app-chart__legend-swatch')
      .style('background-color', colour(index))
    entry.append('span').text(item.name)
  })
}
