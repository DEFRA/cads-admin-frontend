import { renderComponent } from '../../../../../tests/helpers/component-helpers.js'

describe('Action form Component', () => {
  const params = {
    id: 'cancel-query',
    title: 'Cancel a running query',
    description: 'Stops the query a session is running.',
    buttonText: 'Cancel query',
    requiresPid: true,
    formAction: '/db-monitoring/postgres-performance/actions/cancel-query'
  }

  test('Should post to the action with a PID input and button', () => {
    const $form = renderComponent('action-form', params)

    const form = $form('form[data-testid="action-form-cancel-query"]')
    expect(form.attr('method')).toBe('post')
    expect(form.attr('action')).toBe(params.formAction)
    expect($form('legend').text().trim()).toBe('Cancel a running query')
    expect($form('input[name="pid"]').attr('id')).toBe('cancel-query-pid')
    expect($form('input[name="pid"]').attr('inputmode')).toBe('numeric')
    expect($form('button').text().trim()).toBe('Cancel query')
    expect($form('input[name="returnTo"]')).toHaveLength(0)
  })

  test('Should show the error and keep the value entered', () => {
    const $form = renderComponent('action-form', {
      ...params,
      value: 'abc',
      error: 'Enter a process ID as a whole number, like 12345'
    })

    expect($form('.govuk-error-message').text()).toContain(
      'Enter a process ID as a whole number, like 12345'
    )
    expect($form('input[name="pid"]').attr('value')).toBe('abc')
  })

  test('Should include the page to return to', () => {
    const $form = renderComponent('action-form', {
      ...params,
      returnTo: 'active_queries'
    })

    expect($form('input[name="returnTo"]').attr('value')).toBe('active_queries')
  })

  test('Should render an action without a PID and with a warning', () => {
    const $form = renderComponent('action-form', {
      id: 'reset-query-statistics',
      title: 'Reset query statistics',
      description: 'Clears the statistics.',
      warningText: 'Query statistics cannot be recovered.',
      buttonText: 'Reset query statistics',
      buttonClasses: 'govuk-button--warning',
      requiresPid: false,
      formAction: '/db-monitoring/postgres-performance/actions/reset'
    })

    expect($form('input[name="pid"]')).toHaveLength(0)
    expect($form('.govuk-warning-text').text()).toContain(
      'Query statistics cannot be recovered.'
    )
    expect($form('button').hasClass('govuk-button--warning')).toBe(true)
  })
})
