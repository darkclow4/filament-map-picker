export default function mapPickerFormComponent(config) {
    return {
        activeTile: config.tile ?? 'osm',
        currentLat: null,
        currentLng: null,
        height: config.height ?? '400px',
        isDisabled: !!config.isDisabled,
        isSearchable: !!config.isSearchable,
        isSearching: false,
        layer: null,
        layersControl: null,
        map: null,
        marker: null,
        mode: config.mode ?? 'drag',
        moveHandler: null,
        moveEndHandler: null,
        clickHandler: null,
        statePath: config.statePath,
        searchError: '',
        searchProviderUrl: config.searchProviderUrl ?? 'https://nominatim.openstreetmap.org/search',
        searchQuery: '',
        searchResultLimit: Number(config.searchResultLimit ?? 5),
        searchResultsOpen: false,
        searchResults: [],
        activeSearchResultKey: null,
        searchResultLabel: '',
        documentClickHandler: null,
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
            await this.waitForLeaflet()

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
                this.marker = window.L.marker([this.currentLat, this.currentLng], {
                    icon: this.makeClickMarkerIcon(),
                }).addTo(this.map)

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

            this.$watch(
                () => this.$wire.get(this.statePath),
                (value) => {
                    const state = this.normalizeState(value)

                    if (!state) {
                        return
                    }

                    if (this.coordinatesMatch(state.lat, state.lng)) {
                        return
                    }

                    this.setCoordinates(state.lat, state.lng)
                },
            )

            this.syncState()

            this.resizeObserver = new ResizeObserver(() => {
                this.map?.invalidateSize()
            })

            this.resizeObserver.observe(this.$root)

            this.documentClickHandler = (event) => {
                if (!this.$root?.contains(event.target)) {
                    this.searchResultsOpen = false
                }
            }

            document.addEventListener('click', this.documentClickHandler)

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

        async waitForLeaflet() {
            if (window.L) {
                return
            }

            await new Promise((resolve, reject) => {
                let attempts = 0
                const maxAttempts = 100

                const check = () => {
                    if (window.L) {
                        resolve()

                        return
                    }

                    attempts += 1

                    if (attempts >= maxAttempts) {
                        reject(new Error('Leaflet asset was not loaded.'))

                        return
                    }

                    window.setTimeout(check, 50)
                }

                check()
            })
        },

        async performSearch() {
            if (!this.isSearchable || this.isDisabled || this.isSearching) {
                return
            }

            const query = this.searchQuery.trim()

            if (!query.length) {
                this.searchError = 'Enter a place name to search.'
                this.searchResultLabel = ''
                this.searchResults = []
                this.searchResultsOpen = false

                return
            }

            this.isSearching = true
            this.searchError = ''
            this.searchResultLabel = ''
            this.searchResults = []
            this.searchResultsOpen = false

            try {
                const url = new URL(this.searchProviderUrl)
                const resultLimit = Number.isFinite(this.searchResultLimit) ? Math.max(1, this.searchResultLimit) : 5

                url.searchParams.set('q', query)
                url.searchParams.set('format', 'jsonv2')
                url.searchParams.set('limit', String(resultLimit))

                const response = await fetch(url.toString(), {
                    headers: {
                        Accept: 'application/json',
                    },
                })

                if (!response.ok) {
                    throw new Error('Search request failed.')
                }

                const results = await response.json()
                const mappedResults = Array.isArray(results)
                    ? results
                          .map((result) => {
                              const lat = Number(result.lat)
                              const lng = Number(result.lon)

                              if (Number.isNaN(lat) || Number.isNaN(lng)) {
                                  return null
                              }

                              return {
                                  lat,
                                  lng,
                                  label: typeof result.display_name === 'string' ? result.display_name : query,
                              }
                          })
                          .filter(Boolean)
                    : []

                if (!mappedResults.length) {
                    this.searchError = 'No matching place found.'

                    return
                }

                this.searchResults = mappedResults
                this.searchResultsOpen = true
                this.activeSearchResultKey = null
                this.searchResultLabel = `${mappedResults.length} result${mappedResults.length > 1 ? 's' : ''} found.`
            } catch (error) {
                this.searchError = error instanceof Error ? error.message : 'Unable to complete the search.'
            } finally {
                this.isSearching = false
            }
        },

        toggleSearchResults() {
            if (!this.searchResults.length) {
                return
            }

            this.searchResultsOpen = !this.searchResultsOpen
        },

        closeSearchResults() {
            this.searchResultsOpen = false
        },

        getSearchResultKey(result) {
            if (!result) {
                return null
            }

            return `${result.lat}:${result.lng}:${result.label}`
        },

        isSearchResultActive(result) {
            return this.activeSearchResultKey !== null && this.activeSearchResultKey === this.getSearchResultKey(result)
        },

        selectSearchResult(result) {
            if (!result) {
                return
            }

            this.searchError = ''
            this.searchResultLabel = result.label
            this.searchQuery = result.label
            this.activeSearchResultKey = this.getSearchResultKey(result)
            this.closeSearchResults()

            this.setCoordinates(result.lat, result.lng, { pan: false })
            this.map.setView([result.lat, result.lng], Math.max(this.zoom, 18), {
                animate: true,
            })
            this.syncState()
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
                this.layersControl = window.L.control
                    .layers(
                        baseLayers,
                        {},
                        {
                            collapsed: true,
                            position: 'topright',
                        },
                    )
                    .addTo(this.map)

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

        makeClickMarkerIcon() {
            return window.L.divIcon({
                className: '',
                html: `
                    <div class="fi-map-picker-click-marker-icon">
                        <div class="fi-map-picker-click-marker-pin"></div>
                        <div class="fi-map-picker-click-marker-shadow"></div>
                    </div>
                `,
                iconSize: [30, 42],
                iconAnchor: [15, 42],
                popupAnchor: [0, -36],
            })
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

            if (this.documentClickHandler) {
                document.removeEventListener('click', this.documentClickHandler)
            }

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
            this.activeSearchResultKey = null
            this.documentClickHandler = null
            this.searchResults = []
            this.tileLayers = {}
        },
    }
}
