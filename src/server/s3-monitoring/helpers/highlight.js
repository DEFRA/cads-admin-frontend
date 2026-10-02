/**
 * Lightweight syntax highlighting for file previews. Each line becomes a list
 * of { type, text } tokens which the template renders as spans, so content is
 * always HTML-escaped by Nunjucks and never marked safe.
 *
 * Highlighting is line-based because previews are a slice of a file: CSV
 * columns and JSON tokens are coloured per line, XML carries tag/comment state
 * across lines.
 */

/** @typedef {{ type?: string, text: string }} Token */

const csvColumnColours = 6

function pushToken(tokens, type, text) {
  if (text) {
    tokens.push(type ? { type, text } : { text })
  }
}

/** @returns {Token[]} */
function highlightDelimitedLine(line, delimiter) {
  const tokens = []
  let column = 0
  let field = ''
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
      field += char
    } else if (char === delimiter && !inQuotes) {
      pushToken(tokens, `col${column % csvColumnColours}`, field)
      pushToken(tokens, 'punctuation', char)
      field = ''
      column++
    } else {
      field += char
    }
  }
  pushToken(tokens, `col${column % csvColumnColours}`, field)

  return tokens
}

const jsonPattern =
  /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g

/** @returns {Token[]} */
function highlightJsonLine(line) {
  const tokens = []
  let last = 0

  for (const match of line.matchAll(jsonPattern)) {
    const [whole, string, colon, number, literal, punctuation] = match
    pushToken(tokens, null, line.slice(last, match.index))

    if (string) {
      pushToken(tokens, colon ? 'key' : 'string', string)
      pushToken(tokens, 'punctuation', colon)
    } else if (number) {
      pushToken(tokens, 'num', number)
    } else if (literal) {
      pushToken(tokens, 'literal', literal)
    } else {
      pushToken(tokens, 'punctuation', punctuation)
    }

    last = match.index + whole.length
  }
  pushToken(tokens, null, line.slice(last))

  return tokens
}

const xmlInTag = [
  [/\s+/y, null],
  [/\??\/?>/y, 'punctuation'],
  [/"[^"]*"?|'[^']*'?/y, 'value'],
  [/=/y, 'punctuation'],
  [/[^\s=>/?"']+/y, 'attr'],
  [/[\s\S]/y, null]
]
const xmlTagOpen = /<[/?!]?[^\s>/]*/y

/** @returns {Token[][]} */
function highlightXmlLines(lines) {
  let state = 'text'

  return lines.map((line) => {
    const tokens = []
    let index = 0

    while (index < line.length) {
      if (state === 'comment') {
        const end = line.indexOf('-->', index)
        const stop = end === -1 ? line.length : end + 3
        pushToken(tokens, 'comment', line.slice(index, stop))
        index = stop
        state = end === -1 ? 'comment' : 'text'
      } else if (state === 'tag') {
        for (const [pattern, type] of xmlInTag) {
          pattern.lastIndex = index
          const match = pattern.exec(line)
          if (match) {
            pushToken(tokens, type, match[0])
            index += match[0].length
            if (type === 'punctuation' && match[0].endsWith('>')) {
              state = 'text'
            }
            break
          }
        }
      } else {
        const start = line.indexOf('<', index)
        if (start === -1) {
          pushToken(tokens, null, line.slice(index))
          break
        }
        pushToken(tokens, null, line.slice(index, start))

        if (line.startsWith('<!--', start)) {
          const end = line.indexOf('-->', start + 4)
          const stop = end === -1 ? line.length : end + 3
          pushToken(tokens, 'comment', line.slice(start, stop))
          index = stop
          state = end === -1 ? 'comment' : 'text'
        } else {
          xmlTagOpen.lastIndex = start
          const tag = xmlTagOpen.exec(line)[0]
          pushToken(tokens, 'tag', tag)
          index = start + tag.length
          state = 'tag'
        }
      }
    }

    return tokens
  })
}

/**
 * @param {string[]} lines
 * @param {'plain' | 'csv' | 'tsv' | 'json' | 'xml'} format
 * @returns {Token[][]}
 */
export function highlightLines(lines, format) {
  switch (format) {
    case 'csv':
      return lines.map((line) => highlightDelimitedLine(line, ','))
    case 'tsv':
      return lines.map((line) => highlightDelimitedLine(line, '\t'))
    case 'json':
      return lines.map(highlightJsonLine)
    case 'xml':
      return highlightXmlLines(lines)
    default:
      return lines.map((line) => (line ? [{ text: line }] : []))
  }
}
