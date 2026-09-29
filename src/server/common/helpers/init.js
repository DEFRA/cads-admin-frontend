/* istanbul ignore file */

function initModule(attributeName, module) {
  if (!attributeName) {
    return
  }

  const $element = document.querySelector(`[data-module="${attributeName}"]`)

  if ($element) {
    module($element)
  }
}

export { initModule }
