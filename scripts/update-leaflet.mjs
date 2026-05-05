import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { transform } from 'lightningcss'

const execFileAsync = promisify(execFile)
const require = createRequire(import.meta.url)
const packageRoot = resolve(process.cwd())

await execFileAsync('npm', ['install'], { cwd: packageRoot })

const leafletPackageJson = require.resolve('leaflet/package.json')
const leafletRoot = resolve(leafletPackageJson, '..')
const leafletDist = resolve(leafletRoot, 'dist')
const targetDir = resolve(packageRoot, 'dist/leaflet')
const leafletDrawPackageJson = require.resolve('leaflet-draw/package.json')
const leafletDrawRoot = resolve(leafletDrawPackageJson, '..')
const leafletDrawDist = resolve(leafletDrawRoot, 'dist')
const leafletDrawTargetDir = resolve(packageRoot, 'dist/leaflet-draw')

await rm(targetDir, { recursive: true, force: true })
await mkdir(targetDir, { recursive: true })
await rm(leafletDrawTargetDir, { recursive: true, force: true })
await mkdir(leafletDrawTargetDir, { recursive: true })

await cp(resolve(leafletDist, 'leaflet.js'), resolve(targetDir, 'leaflet.js'))

const rawCss = await readFile(resolve(leafletDist, 'leaflet.css'), 'utf8')
const images = [
  'layers.png',
  'layers-2x.png',
  'marker-icon.png',
  'marker-icon-2x.png',
  'marker-shadow.png',
]

let embeddedCss = rawCss

for (const image of images) {
  const buffer = await readFile(resolve(leafletDist, 'images', image))
  const mime = 'image/png'
  const dataUri = `data:${mime};base64,${buffer.toString('base64')}`
  embeddedCss = embeddedCss.replaceAll(`url(images/${image})`, `url("${dataUri}")`)
}

const minifiedCss = transform({
  code: Buffer.from(embeddedCss),
  filename: resolve(targetDir, 'leaflet.css'),
  minify: true,
  sourceMap: false,
  targets: {
    chrome: 111 << 16,
    safari: 16 << 16,
    firefox: 128 << 16,
  },
})

await writeFile(resolve(targetDir, 'leaflet.css'), `${minifiedCss.code.toString()}\n`, 'utf8')

await cp(resolve(leafletDrawDist, 'leaflet.draw.js'), resolve(leafletDrawTargetDir, 'leaflet.draw.js'))

const leafletDrawCss = await readFile(resolve(leafletDrawDist, 'leaflet.draw.css'), 'utf8')
const leafletDrawAssets = [
  ['spritesheet.svg', 'image/svg+xml'],
  ['spritesheet.png', 'image/png'],
  ['spritesheet-2x.png', 'image/png'],
]

let embeddedLeafletDrawCss = leafletDrawCss

for (const [asset, mime] of leafletDrawAssets) {
  const buffer = await readFile(resolve(leafletDrawDist, 'images', asset))
  const dataUri = `data:${mime};base64,${buffer.toString('base64')}`
  const patterns = [
    `url(images/${asset})`,
    `url("images/${asset}")`,
    `url('images/${asset}')`,
    `url(\"images/${asset}\")`,
    `url(\'images/${asset}\')`,
  ]

  for (const pattern of patterns) {
    embeddedLeafletDrawCss = embeddedLeafletDrawCss.replaceAll(pattern, `url("${dataUri}")`)
  }
}

const minifiedLeafletDrawCss = transform({
  code: Buffer.from(embeddedLeafletDrawCss),
  filename: resolve(leafletDrawTargetDir, 'leaflet.draw.css'),
  minify: true,
  sourceMap: false,
  targets: {
    chrome: 111 << 16,
    safari: 16 << 16,
    firefox: 128 << 16,
  },
})

await writeFile(resolve(leafletDrawTargetDir, 'leaflet.draw.css'), `${minifiedLeafletDrawCss.code.toString()}\n`, 'utf8')

console.log('Updated bundled Leaflet assets.')
