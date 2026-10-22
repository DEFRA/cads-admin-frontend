// GOV.UK colours with at least 3:1 contrast against white, so bars meet
// WCAG 1.4.11 (non-text contrast). Series are also named in the legend and
// the data table, so colour is never the only way to tell them apart.
export const chartColours = [
  '#1d70b8', // blue
  '#00703c', // green
  '#d4351c', // red
  '#4c2c92', // purple
  '#d53880' // pink
]

export const axisColour = '#505a5f'

export function seriesColour(index) {
  return chartColours[index % chartColours.length]
}
