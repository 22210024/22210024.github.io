const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = process.cwd()
const postsDir = path.join(root, 'source', '_posts')

function firstCommitEpoch(file) {
  const rel = path.relative(root, file).split(path.sep).join('/')
  try {
    const out = execFileSync(
      'git',
      ['log', '--follow', '--diff-filter=A', '--format=%ct', '--', rel],
      { encoding: 'utf8' }
    ).trim()
    const lines = out.split('\n').filter(Boolean)
    if (lines.length) return Number(lines[lines.length - 1])
  } catch (e) {}
  return Math.floor(fs.statSync(file).mtimeMs / 1000)
}

function chinaTime(epoch) {
  return new Date(epoch * 1000 + 8 * 3600 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

let filled = 0
for (const file of walk(postsDir).filter((f) => f.endsWith('.md'))) {
  const src = fs.readFileSync(file, 'utf8')
  const frontMatter = src.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!frontMatter) continue
  if (/^date\s*:/m.test(frontMatter[1])) continue

  const eol = src.includes('\r\n') ? '\r\n' : '\n'
  const openEnd = frontMatter[0].indexOf(eol) + eol.length
  const dateLine = `date: ${chinaTime(firstCommitEpoch(file))}`
  const next = src.slice(0, frontMatter.index) +
    frontMatter[0].slice(0, openEnd) + dateLine + eol +
    src.slice(frontMatter.index + openEnd)

  fs.writeFileSync(file, next)
  console.log(`filled date for ${path.relative(root, file)}`)
  filled++
}

if (!filled) console.log('all posts already have dates')