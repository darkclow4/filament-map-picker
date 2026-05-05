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

await rm(targetDir, { recursive: true, force: true })
await mkdir(targetDir, { recursive: true })

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

console.log('Updated bundled Leaflet assets.')
