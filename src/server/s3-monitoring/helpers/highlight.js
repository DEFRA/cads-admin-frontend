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
  [/[^\s=>/?"']+/y, 'attr']
]
const xmlTagOpen = /<[/?!]?[^\s>/]*/y

/**
 * XML readers consume part of a line from `index` in a given state, push the
 * tokens they read and return where to carry on and in which state.
 * @typedef {{ index: number, state: 'text' | 'tag' | 'comment' }} XmlStep
 */

/** @returns {XmlStep} */
function readXmlComment(line, index, tokens, searchFrom = index) {
  const end = line.indexOf('-->', searchFrom)
  const stop = end === -1 ? line.length : end + 3
  pushToken(tokens, 'comment', line.slice(index, stop))

  return { index: stop, state: end === -1 ? 'comment' : 'text' }
}

/** @returns {XmlStep} */
function readXmlTag(line, index, tokens) {
  // Anything no pattern recognises is consumed one character at a time
  let text = line[index]
  let type = null

  for (const [pattern, patternType] of xmlInTag) {
    pattern.lastIndex = index
    const match = pattern.exec(line)
    if (match) {
      text = match[0]
      type = patternType
      break
    }
  }

  pushToken(tokens, type, text)
  const closed = type === 'punctuation' && text.endsWith('>')

  return { index: index + text.length, state: closed ? 'text' : 'tag' }
}

/** @returns {XmlStep} */
function readXmlText(line, index, tokens) {
  const start = line.indexOf('<', index)
  if (start === -1) {
    pushToken(tokens, null, line.slice(index))
    return { index: line.length, state: 'text' }
  }
  pushToken(tokens, null, line.slice(index, start))

  if (line.startsWith('<!--', start)) {
    return readXmlComment(line, start, tokens, start + 4)
  }

  xmlTagOpen.lastIndex = start
  const tag = xmlTagOpen.exec(line)[0]
  pushToken(tokens, 'tag', tag)

  return { index: start + tag.length, state: 'tag' }
}

const xmlReaders = {
  text: readXmlText,
  tag: readXmlTag,
  comment: readXmlComment
}

/** @returns {Token[][]} */
function highlightXmlLines(lines) {
  let state = 'text'

  return lines.map((line) => {
    const tokens = []
    let index = 0

    while (index < line.length) {
      const step = xmlReaders[state](line, index, tokens)
      index = step.index
      state = step.state
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
