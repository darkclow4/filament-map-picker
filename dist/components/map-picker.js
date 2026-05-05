export default function mapPickerFormComponent(config) {
    return {
        activeTile: config.tile ?? 'osm',
        currentLat: null,
        currentLng: null,
        height: config.height ?? '400px',
        isDisabled: !!config.isDisabled,
        layer: null,
        layersControl: null,
        map: null,
        marker: null,
        mode: config.mode ?? 'drag',
        moveHandler: null,
        moveEndHandler: null,
        clickHandler: null,
        statePath: config.statePath,
        tileLayers: {},
        tileKeys: Object.keys(config.tiles ?? {}),
        tiles: config.tiles ?? {},
        zoom: Number(config.zoom ?? 13),
        defaultLocation: config.defaultLocation ?? { lat: -6.2, lng: 106.816666 },
        resizeObserver: null,
        updateTimeout: null,

        get formattedLat() {
            return this.formatCoordinate(this.currentLat)
        },

        get formattedLng() {
            return this.formatCoordinate(this.currentLng)
        },

        async init() {
            await this.ensureLeaflet()

            this.initializeTiles()

            const initialState = this.normalizeState(this.$wire.get(this.statePath))
            const initialLocation = initialState ?? this.defaultLocation

            this.currentLat = Number(initialLocation.lat)
            this.currentLng = Number(initialLocation.lng)

            this.map = window.L.map(this.$refs.map, {
                attributionControl: true,
                center: [this.currentLat, this.currentLng],
                dragging: !this.isDisabled,
                scrollWheelZoom: !this.isDisabled,
                tap: !this.isDisabled,
                touchZoom: !this.isDisabled,
                zoomControl: true,
            }).setView([this.currentLat, this.currentLng], this.zoom)

            this.initializeLayersControl()
            this.applyTileLayer(this.activeTile)

            this.map.whenReady(() => {
                requestAnimationFrame(() => {
                    this.map?.invalidateSize()
                })
            })

            if (this.mode === 'click') {
                this.marker = window.L.marker([this.currentLat, this.currentLng]).addTo(this.map)

                if (!this.isDisabled) {
                    this.clickHandler = (event) => {
                        this.setCoordinates(event.latlng.lat, event.latlng.lng, { pan: false })
                        this.syncState()
                    }

                    this.map.on('click', this.clickHandler)
                }
            } else if (!this.isDisabled) {
                this.moveHandler = () => {
                    const center = this.map.getCenter()

                    this.setCoordinates(center.lat, center.lng, { sync: false, pan: false })
                    this.syncStateDebounced()
                }

                this.moveEndHandler = () => {
                    const center = this.map.getCenter()

                    this.setCoordinates(center.lat, center.lng, { sync: false, pan: false })
                    this.syncState()
                }

                this.map.on('move', this.moveHandler)
                this.map.on('moveend', this.moveEndHandler)
            }

            this.$watch(() => this.$wire.get(this.statePath), (value) => {
                const state = this.normalizeState(value)

                if (!state) {
                    return
                }

                if (this.coordinatesMatch(state.lat, state.lng)) {
                    return
                }

                this.setCoordinates(state.lat, state.lng)
            })

            this.syncState()

            this.resizeObserver = new ResizeObserver(() => {
                this.map?.invalidateSize()
            })

            this.resizeObserver.observe(this.$root)

            setTimeout(() => {
                this.map?.invalidateSize()
            }, 200)
        },

        initializeTiles() {
            if (!this.tiles.osm) {
                this.tiles.osm = {
                    label: 'OpenStreetMap',
                    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    options: {
                        attribution: '&copy; OpenStreetMap contributors',
                        maxZoom: 19,
                    },
                }
            }

            this.tileKeys = Object.keys(this.tiles)

            if (!this.tiles[this.activeTile]) {
                this.activeTile = 'osm'
            }
        },

        async ensureLeaflet() {
            if (window.L) {
                return
            }

            await new Promise((resolve, reject) => {
                const existingScript = document.querySelector('script[data-map-picker-leaflet]')

                if (existingScript) {
                    if (existingScript.dataset.loaded === 'true' && window.L) {
                        resolve()

                        return
                    }

                    existingScript.addEventListener('load', () => resolve(), { once: true })
                    existingScript.addEventListener('error', () => reject(new Error('Failed loading Leaflet.')), { once: true })

                    return
                }

                const script = document.createElement('script')

                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
                script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
                script.crossOrigin = ''
                script.dataset.mapPickerLeaflet = 'true'
                script.onload = () => {
                    script.dataset.loaded = 'true'
                    resolve()
                }
                script.onerror = () => reject(new Error('Failed loading Leaflet.'))

                document.head.appendChild(script)
            })
        },

        applyTileLayer(tileKey) {
            const resolvedTileKey = this.tiles[tileKey] ? tileKey : 'osm'
            const tile = this.tiles[resolvedTileKey] ?? this.tiles.osm

            if (!tile) {
                return
            }

            if (this.layer) {
                this.map.removeLayer(this.layer)
            }

            this.activeTile = resolvedTileKey
            this.layer = this.tileLayers[resolvedTileKey] ?? window.L.tileLayer(tile.url, tile.options ?? {})
            this.tileLayers[resolvedTileKey] = this.layer
            this.layer.addTo(this.map)
        },

        initializeLayersControl() {
            this.tileLayers = {}

            const baseLayers = {}

            this.tileKeys.forEach((tileKey) => {
                const tile = this.tiles[tileKey]

                if (!tile) {
                    return
                }

                this.tileLayers[tileKey] = window.L.tileLayer(tile.url, tile.options ?? {})
                baseLayers[tile.label ?? tileKey] = this.tileLayers[tileKey]
            })

            if (this.tileKeys.length > 1) {
                this.layersControl = window.L.control.layers(baseLayers, {}, {
                    collapsed: true,
                    position: 'topright',
                }).addTo(this.map)

                this.map.on('baselayerchange', (event) => {
                    const matchedEntry = Object.entries(this.tileLayers).find(([, layer]) => layer === event.layer)

                    if (!matchedEntry) {
                        return
                    }

                    this.activeTile = matchedEntry[0]
                    this.layer = matchedEntry[1]
                })
            }
        },

        setCoordinates(lat, lng, options = {}) {
            this.currentLat = Number(lat)
            this.currentLng = Number(lng)

            if (this.mode === 'click' && this.marker) {
                this.marker.setLatLng([this.currentLat, this.currentLng])
            }

            if (options.pan !== false && this.map) {
                this.map.panTo([this.currentLat, this.currentLng], {
                    animate: true,
                    duration: 0.4,
                })
            }

            if (options.sync !== false) {
                this.syncState()
            }
        },

        syncStateDebounced() {
            clearTimeout(this.updateTimeout)

            this.updateTimeout = setTimeout(() => {
                this.syncState()
            }, 150)
        },

        syncState() {
            if (this.currentLat === null || this.currentLng === null) {
                return
            }

            this.$wire.set(this.statePath, {
                lat: this.currentLat,
                lng: this.currentLng,
            })
        },

        normalizeState(state) {
            if (!state || typeof state !== 'object') {
                return null
            }

            if (state.lat === undefined || state.lng === undefined) {
                return null
            }

            const lat = Number(state.lat)
            const lng = Number(state.lng)

            if (Number.isNaN(lat) || Number.isNaN(lng)) {
                return null
            }

            return { lat, lng }
        },

        coordinatesMatch(lat, lng) {
            const nextLat = Number(lat)
            const nextLng = Number(lng)

            return Math.abs(this.currentLat - nextLat) < 0.000001 && Math.abs(this.currentLng - nextLng) < 0.000001
        },

        formatCoordinate(value) {
            if (value === null || Number.isNaN(Number(value))) {
                return '-'
            }

            return Number(value).toFixed(6)
        },

        destroy() {
            clearTimeout(this.updateTimeout)

            this.resizeObserver?.disconnect()
            this.resizeObserver = null

            if (this.map) {
                if (this.clickHandler) {
                    this.map.off('click', this.clickHandler)
                }

                if (this.moveHandler) {
                    this.map.off('move', this.moveHandler)
                }

                if (this.moveEndHandler) {
                    this.map.off('moveend', this.moveEndHandler)
                }

                this.map.remove()
            }

            this.clickHandler = null
            this.layersControl = null
            this.moveHandler = null
            this.moveEndHandler = null
            this.layer = null
            this.marker = null
            this.map = null
            this.tileLayers = {}
        },
    }
}
