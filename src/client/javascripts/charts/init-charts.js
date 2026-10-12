import { renderBarChart } from './bar-chart.js'
import { renderGroupedBarChart } from './grouped-bar-chart.js'
import { renderHorizontalBarChart } from './horizontal-bar-chart.js'

const renderers = {
  bar: renderBarChart,
  'horizontal-bar': renderHorizontalBarChart,
  'grouped-bar': renderGroupedBarChart
}

/**
 * Draws a chart in a figure from the JSON in its data-chart attribute.
 * Returns false, leaving the data table as the only content, when the data
 * cannot be read.
 *
 * @param {HTMLElement} figure
 */
export function renderChart(figure) {
  let chart
  try {
    chart = JSON.parse(figure.dataset.chart ?? '')
  } catch {
    return false
  }

  const render = renderers[chart?.type]
  if (!render || !chart.categories?.length || !chart.series?.length) {
    return false
  }

  figure.replaceChildren()
  render(figure, chart)
  return true
}

/**
 * @param {ParentNode} root
 */
export function initCharts(root = document) {
  root.querySelectorAll('[data-module="app-chart"]').forEach((figure) => {
    renderChart(/** @type {HTMLElement} */ (figure))
  })
}
