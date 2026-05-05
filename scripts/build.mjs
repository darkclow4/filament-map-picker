import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { minify } from 'terser'
import { transform } from 'lightningcss'

const packageRoot = resolve(process.cwd())

const files = {
  mapJsIn: resolve(packageRoot, 'resources/js/components/map-picker.js'),
  mapJsOut: resolve(packageRoot, 'dist/components/map-picker.js'),
  mapCssIn: resolve(packageRoot, 'resources/css/map-picker.css'),
  mapCssOut: resolve(packageRoot, 'dist/map-picker.css'),
}

await mkdir(dirname(files.mapJsOut), { recursive: true })
await mkdir(dirname(files.mapCssOut), { recursive: true })

const jsSource = await readFile(files.mapJsIn, 'utf8')
const minifiedJs = await minify(jsSource, {
  compress: true,
  format: {
    comments: false,
  },
  module: true,
  mangle: true,
})

if (! minifiedJs.code) {
  throw new Error('Failed to minify map-picker.js')
}

await writeFile(files.mapJsOut, `${minifiedJs.code}\n`, 'utf8')

const cssSource = await readFile(files.mapCssIn)
const minifiedCss = transform({
  code: cssSource,
  filename: files.mapCssIn,
  minify: true,
  sourceMap: false,
  targets: {
    chrome: 111 << 16,
    safari: 16 << 16,
    firefox: 128 << 16,
  },
})

await writeFile(files.mapCssOut, `${minifiedCss.code.toString()}\n`, 'utf8')

console.log('Built minified package assets.')
