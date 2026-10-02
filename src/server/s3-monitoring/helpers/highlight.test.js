import { highlightLines } from './highlight.js'

const joined = (tokens) => tokens.map((token) => token.text).join('')

describe('#highlightLines', () => {
  test('Should keep plain text as a single token', () => {
    expect(highlightLines(['hello world', ''], 'plain')).toEqual([
      [{ text: 'hello world' }],
      []
    ])
  })

  test('Should colour CSV columns, respecting quoted delimiters', () => {
    const [tokens] = highlightLines(['a,"b, c",d'], 'csv')

    expect(tokens).toEqual([
      { type: 'col0', text: 'a' },
      { type: 'punctuation', text: ',' },
      { type: 'col1', text: '"b, c"' },
      { type: 'punctuation', text: ',' },
      { type: 'col2', text: 'd' }
    ])
  })

  test('Should cycle CSV column colours', () => {
    const [tokens] = highlightLines(['1,2,3,4,5,6,7'], 'csv')
    const columns = tokens.filter((token) => token.type !== 'punctuation')

    expect(columns.at(-1)).toEqual({ type: 'col0', text: '7' })
  })

  test('Should split TSV on tabs', () => {
    const [tokens] = highlightLines(['a\tb,c'], 'tsv')

    expect(tokens).toEqual([
      { type: 'col0', text: 'a' },
      { type: 'punctuation', text: '\t' },
      { type: 'col1', text: 'b,c' }
    ])
  })

  test('Should tokenise JSON keys, values and punctuation', () => {
    const [tokens] = highlightLines(
      ['  {"id": -1.5e3, "ok": false, "name": "x\\"y", "n": null}'],
      'json'
    )

    expect(joined(tokens)).toBe(
      '  {"id": -1.5e3, "ok": false, "name": "x\\"y", "n": null}'
    )
    expect(tokens).toEqual(
      expect.arrayContaining([
        { type: 'key', text: '"id"' },
        { type: 'num', text: '-1.5e3' },
        { type: 'literal', text: 'false' },
        { type: 'string', text: '"x\\"y"' },
        { type: 'literal', text: 'null' }
      ])
    )
  })

  test('Should tokenise XML tags, attributes and values', () => {
    const [tokens] = highlightLines(
      ['<?xml version="1.0"?><a id=\'1\'>text</a><br/>'],
      'xml'
    )

    expect(joined(tokens)).toBe(
      '<?xml version="1.0"?><a id=\'1\'>text</a><br/>'
    )
    expect(tokens).toEqual([
      { type: 'tag', text: '<?xml' },
      { text: ' ' },
      { type: 'attr', text: 'version' },
      { type: 'punctuation', text: '=' },
      { type: 'value', text: '"1.0"' },
      { type: 'punctuation', text: '?>' },
      { type: 'tag', text: '<a' },
      { text: ' ' },
      { type: 'attr', text: 'id' },
      { type: 'punctuation', text: '=' },
      { type: 'value', text: "'1'" },
      { type: 'punctuation', text: '>' },
      { text: 'text' },
      { type: 'tag', text: '</a' },
      { type: 'punctuation', text: '>' },
      { type: 'tag', text: '<br' },
      { type: 'punctuation', text: '/>' }
    ])
  })

  test('Should carry XML comments and tags across lines', () => {
    const lines = highlightLines(
      ['<!-- start', 'still comment -->', '<item', '  code="A1">x</item>'],
      'xml'
    )

    expect(lines[0]).toEqual([{ type: 'comment', text: '<!-- start' }])
    expect(lines[1]).toEqual([{ type: 'comment', text: 'still comment -->' }])
    expect(lines[3]).toEqual([
      { text: '  ' },
      { type: 'attr', text: 'code' },
      { type: 'punctuation', text: '=' },
      { type: 'value', text: '"A1"' },
      { type: 'punctuation', text: '>' },
      { text: 'x' },
      { type: 'tag', text: '</item' },
      { type: 'punctuation', text: '>' }
    ])
  })

  test('Should keep a single-line XML comment', () => {
    const [tokens] = highlightLines(['<!-- note --><a/>'], 'xml')

    expect(tokens[0]).toEqual({ type: 'comment', text: '<!-- note -->' })
    expect(tokens[1]).toEqual({ type: 'tag', text: '<a' })
  })
})
