export default function mapPickerFormComponent(config) {
    return {
        activeSearchResultKey: null,
        activeTile: config.tile ?? 'osm',
        allowsMultipleShapes: !!config.allowsMultipleShapes,
        clickHandler: null,
        currentLat: null,
        currentLng: null,
        defaultLocation: config.defaultLocation ?? { lat: -6.2, lng: 106.816666 },
        documentClickHandler: null,
        drawControl: null,
        drawCreatedHandler: null,
        drawDeletedHandler: null,
        drawEditedHandler: null,
        drawMeasurementLabels: [],
        drawTools: Array.isArray(config.drawTools) ? config.drawTools : [],
        drawnItems: null,
        emptyGeoJson: config.emptyGeoJson ?? { type: 'FeatureCollection', features: [] },
        height: config.height ?? '400px',
        areaMeasurementUnit: config.areaMeasurementUnit ?? 'm2',
        isDisabled: !!config.isDisabled,
        isDrawable: !!config.isDrawable,
        isSearchable: !!config.isSearchable,
        isSearching: false,
        shouldShowAreaMeasurement: !!config.shouldShowAreaMeasurement,
        shouldFitDrawBounds: config.shouldFitDrawBounds !== false,
        layer: null,
        layersControl: null,
        leafletDrawScriptUrl: config.leafletDrawScriptUrl ?? null,
        leafletScriptUrl: config.leafletScriptUrl ?? null,
        map: null,
        marker: null,
        mode: config.mode ?? 'drag',
        moveEndHandler: null,
        moveHandler: null,
        resizeObserver: null,
        searchError: '',
        searchProviderUrl: config.searchProviderUrl ?? 'https://nominatim.openstreetmap.org/search',
        searchQuery: '',
        searchResultLabel: '',
        searchResultLimit: Number(config.searchResultLimit ?? 5),
        searchResults: [],
        searchResultsOpen: false,
        statePath: config.statePath,
        tileKeys: Object.keys(config.tiles ?? {}),
        tileLayers: {},
        tiles: config.tiles ?? {},
        updateTimeout: null,
        zoom: Number(config.zoom ?? 13),

        async init() {
            await this.waitForLeaflet()

            if (this.isDrawable) {
                await this.waitForLeafletDraw()
            }

            this.initializeTiles()

            const rawState = this.$wire.get(this.statePath)
            const initialState = this.normalizeMapState(rawState)

            this.currentLat = Number(initialState.lat)
            this.currentLng = Number(initialState.lng)

            this.initializeMap()

            this.initializeLayersControl()
            this.applyTileLayer(this.activeTile)
            this.setupMapReadyHandler()

            this.initializeLocationInteraction(initialState)

            if (this.isDrawable) {
                this.initializeDrawControls(initialState.geojson)
            }

            this.setupStateWatcher()

            this.syncState()

            this.setupResizeObserver()
            this.setupDocumentClickHandler()
            this.scheduleMapResize()
        },

        initializeMap() {
            this.map = window.L.map(this.$refs.map, {
                attributionControl: true,
                center: [this.currentLat, this.currentLng],
                dragging: !this.isDisabled,
                scrollWheelZoom: !this.isDisabled,
                tap: !this.isDisabled,
                touchZoom: !this.isDisabled,
                zoomControl: true,
            }).setView([this.currentLat, this.currentLng], this.zoom)
        },

        setupMapReadyHandler() {
            this.map.whenReady(() => {
                requestAnimationFrame(() => {
                    this.map?.invalidateSize()
                })
            })
        },

        setupStateWatcher() {
            this.$watch(
                () => this.$wire.get(this.statePath),
                (value) => {
                    const state = this.normalizeMapState(value)

                    if (!this.coordinatesMatch(state.lat, state.lng)) {
                        this.setCoordinates(state.lat, state.lng)
                    }

                    if (this.isDrawable) {
                        this.replaceDrawnItems(state.geojson)
                    }
                },
            )
        },

        setupResizeObserver() {
            this.resizeObserver = new ResizeObserver(() => {
                this.map?.invalidateSize()
            })

            this.resizeObserver.observe(this.$root)
        },

        setupDocumentClickHandler() {
            this.documentClickHandler = (event) => {
                if (!this.$root?.contains(event.target)) {
                    this.searchResultsOpen = false
                }
            }

            document.addEventListener('click', this.documentClickHandler)
        },

        scheduleMapResize() {
            setTimeout(() => {
                this.map?.invalidateSize()
            }, 200)
        },

        initializeLocationInteraction(initialState) {
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

                return
            }

            if (this.isDisabled) {
                return
            }

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

            await this.ensureScript(this.leafletScriptUrl, 'data-map-picker-leaflet-script')
            await this.pollUntil(() => window.L, 'Leaflet asset was not loaded.')
        },

        async waitForLeafletDraw() {
            if (window.L?.Control?.Draw) {
                return
            }

            await this.ensureScript(this.leafletDrawScriptUrl, 'data-map-picker-leaflet-draw-script')
            await this.pollUntil(() => window.L?.Control?.Draw, 'Leaflet Draw asset was not loaded.')
        },

        async ensureScript(url, attribute) {
            if (!url) {
                return
            }

            const existingScript = document.querySelector(`script[${attribute}]`)

            if (existingScript) {
                if (existingScript.dataset.loaded === 'true') {
                    return
                }

                await new Promise((resolve, reject) => {
                    existingScript.addEventListener('load', resolve, { once: true })
                    existingScript.addEventListener('error', reject, { once: true })
                })

                return
            }

            await new Promise((resolve, reject) => {
                const script = document.createElement('script')

                script.src = url
                script.async = true
                script.dataset.loaded = 'false'
                script.setAttribute(attribute, 'true')
                script.addEventListener('load', () => {
                    script.dataset.loaded = 'true'
                    resolve()
                }, { once: true })
                script.addEventListener('error', reject, { once: true })

                document.head.appendChild(script)
            })
        },

        async pollUntil(callback, message) {
            await new Promise((resolve, reject) => {
                let attempts = 0
                const maxAttempts = 100

                const check = () => {
                    if (callback()) {
                        resolve()

                        return
                    }

                    attempts += 1

                    if (attempts >= maxAttempts) {
                        reject(new Error(message))

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
                const resultLimit = this.getNormalizedSearchResultLimit()

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
                        .map((result) => this.mapSearchResult(result, query))
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

        getNormalizedSearchResultLimit() {
            return Number.isFinite(this.searchResultLimit) ? Math.max(1, this.searchResultLimit) : 5
        },

        mapSearchResult(result, fallbackLabel) {
            const lat = Number(result.lat)
            const lng = Number(result.lon)

            if (Number.isNaN(lat) || Number.isNaN(lng)) {
                return null
            }

            return {
                lat,
                lng,
                label: typeof result.display_name === 'string' ? result.display_name : fallbackLabel,
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

        initializeDrawControls(initialGeoJson) {
            this.drawnItems = new window.L.FeatureGroup()
            this.map.addLayer(this.drawnItems)

            this.drawControl = new window.L.Control.Draw({
                draw: {
                    polyline: false,
                    marker: false,
                    circlemarker: false,
                    polygon: this.drawTools.includes('polygon') && !this.isDisabled,
                    rectangle: this.drawTools.includes('rectangle') && !this.isDisabled,
                    circle: this.drawTools.includes('circle') && !this.isDisabled,
                },
                edit: {
                    featureGroup: this.drawnItems,
                    edit: !this.isDisabled,
                    remove: !this.isDisabled,
                },
            })

            this.map.addControl(this.drawControl)

            this.drawCreatedHandler = (event) => {
                if (!this.allowsMultipleShapes) {
                    this.drawnItems.clearLayers()
                }

                this.drawnItems.addLayer(event.layer)

                this.refreshAreaMeasurementLabels()

                if (this.shouldFitDrawBounds) {
                    this.fitToDrawnItems()
                }

                this.syncState()
            }

            this.drawEditedHandler = () => {
                this.refreshAreaMeasurementLabels()

                if (this.shouldFitDrawBounds) {
                    this.fitToDrawnItems(false)
                }

                this.syncState()
            }

            this.drawDeletedHandler = () => {
                this.refreshAreaMeasurementLabels()
                this.syncState()
            }

            this.map.on(window.L.Draw.Event.CREATED, this.drawCreatedHandler)
            this.map.on(window.L.Draw.Event.EDITED, this.drawEditedHandler)
            this.map.on(window.L.Draw.Event.DELETED, this.drawDeletedHandler)

            this.replaceDrawnItems(initialGeoJson)
        },

        replaceDrawnItems(state) {
            if (!this.drawnItems || !window.L?.geoJSON) {
                return
            }

            const current = JSON.stringify(this.serializeDrawnItems())
            const next = JSON.stringify(state ?? this.emptyGeoJson)

            if (current === next) {
                return
            }

            this.drawnItems.clearLayers()
            this.clearAreaMeasurementLabels()

            if (!state?.features?.length) {
                return
            }

            const geoJsonLayer = window.L.geoJSON(state, {
                pointToLayer: (feature, latlng) => {
                    if (feature?.properties?.shape === 'circle') {
                        return window.L.circle(latlng, {
                            radius: Number(feature.properties.radius ?? 0),
                        })
                    }

                    return window.L.marker(latlng)
                },
            })

            geoJsonLayer.eachLayer((layer) => {
                this.drawnItems.addLayer(layer)
            })

            this.refreshAreaMeasurementLabels()
        },

        fitToDrawnItems(animate = true) {
            if (!this.drawnItems) {
                return
            }

            const bounds = this.drawnItems.getBounds()

            if (!bounds.isValid()) {
                return
            }

            this.map.fitBounds(bounds, {
                animate,
                padding: [24, 24],
            })
        },

        serializeDrawnItems() {
            if (!this.drawnItems) {
                return this.emptyGeoJson
            }

            const features = []

            this.drawnItems.eachLayer((layer) => {
                if (typeof layer.toGeoJSON !== 'function') {
                    return
                }

                const feature = layer.toGeoJSON()
                feature.properties = feature.properties ?? {}

                if (layer instanceof window.L.Circle) {
                    feature.properties.shape = 'circle'
                    feature.properties.radius = layer.getRadius()
                } else if (layer instanceof window.L.Rectangle) {
                    feature.properties.shape = 'rectangle'
                } else if (layer instanceof window.L.Polygon) {
                    feature.properties.shape = 'polygon'
                }

                features.push(feature)
            })

            return {
                type: 'FeatureCollection',
                features,
            }
        },

        refreshAreaMeasurementLabels() {
            this.clearAreaMeasurementLabels()

            if (!this.shouldShowAreaMeasurement || !this.drawnItems || !this.map) {
                return
            }

            this.drawnItems.eachLayer((layer) => {
                const measurement = this.calculateLayerArea(layer)

                if (measurement <= 0) {
                    return
                }

                const center = this.getLayerMeasurementCenter(layer)

                if (!center) {
                    return
                }

                const marker = window.L.marker(center, {
                    interactive: false,
                    keyboard: false,
                    zIndexOffset: 1000,
                    icon: window.L.divIcon({
                        className: '',
                        html: `<span class="fi-map-picker-area-label">${this.formatAreaMeasurement(measurement)}</span>`,
                    }),
                }).addTo(this.map)

                this.drawMeasurementLabels.push(marker)
            })
        },

        clearAreaMeasurementLabels() {
            this.drawMeasurementLabels.forEach((label) => {
                this.map?.removeLayer(label)
            })

            this.drawMeasurementLabels = []
        },

        calculateLayerArea(layer) {
            if (layer instanceof window.L.Circle) {
                const radius = Number(layer.getRadius())

                return Math.PI * radius * radius
            }

            if (typeof window.L.GeometryUtil?.geodesicArea === 'function' && typeof layer.getLatLngs === 'function') {
                const latLngs = layer.getLatLngs()
                const ring = Array.isArray(latLngs) ? latLngs[0] ?? [] : []

                if (ring.length >= 3) {
                    return Math.abs(window.L.GeometryUtil.geodesicArea(ring))
                }
            }

            return 0
        },

        getLayerMeasurementCenter(layer) {
            if (typeof layer.getBounds === 'function') {
                const bounds = layer.getBounds()

                if (bounds?.isValid?.()) {
                    return bounds.getCenter()
                }
            }

            if (typeof layer.getLatLng === 'function') {
                return layer.getLatLng()
            }

            return null
        },

        formatAreaMeasurement(area) {
            if (area <= 0) {
                return this.areaMeasurementUnit === 'ha' ? '0 ha' : '0 m2'
            }

            if (this.areaMeasurementUnit === 'ha') {
                return `${(area / 10000).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                    minimumFractionDigits: 0,
                })}&nbsp;ha`
            }

            return `${area.toLocaleString(undefined, {
                maximumFractionDigits: 2,
                minimumFractionDigits: 0,
            })}&nbsp;m²`
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
            const nextState = {
                lat: this.currentLat,
                lng: this.currentLng,
            }

            if (this.isDrawable) {
                nextState.geojson = this.serializeDrawnItems()
            }

            this.$wire.set(this.statePath, nextState)
        },

        normalizeMapState(state) {
            const defaults = {
                lat: Number(this.defaultLocation.lat),
                lng: Number(this.defaultLocation.lng),
                geojson: this.emptyGeoJson,
            }

            if (!state || typeof state !== 'object') {
                return defaults
            }

            const lat = Number(state.lat)
            const lng = Number(state.lng)

            return {
                lat: Number.isNaN(lat) ? defaults.lat : lat,
                lng: Number.isNaN(lng) ? defaults.lng : lng,
                geojson: this.normalizeGeoJsonState(state.geojson) ?? this.emptyGeoJson,
            }
        },

        normalizeGeoJsonState(state) {
            if (!state || typeof state !== 'object') {
                return null
            }

            if (state.type !== 'FeatureCollection' || !Array.isArray(state.features)) {
                return null
            }

            return state
        },

        coordinatesMatch(lat, lng) {
            const nextLat = Number(lat)
            const nextLng = Number(lng)

            return Math.abs(this.currentLat - nextLat) < 0.000001 && Math.abs(this.currentLng - nextLng) < 0.000001
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

                if (this.drawCreatedHandler) {
                    this.map.off(window.L.Draw.Event.CREATED, this.drawCreatedHandler)
                }

                if (this.drawEditedHandler) {
                    this.map.off(window.L.Draw.Event.EDITED, this.drawEditedHandler)
                }

                if (this.drawDeletedHandler) {
                    this.map.off(window.L.Draw.Event.DELETED, this.drawDeletedHandler)
                }

                this.map.remove()
            }

            this.activeSearchResultKey = null
            this.clickHandler = null
            this.documentClickHandler = null
            this.drawControl = null
            this.drawCreatedHandler = null
            this.drawDeletedHandler = null
            this.drawEditedHandler = null
            this.drawnItems = null
            this.layer = null
            this.layersControl = null
            this.map = null
            this.marker = null
            this.moveEndHandler = null
            this.moveHandler = null
            this.drawMeasurementLabels = []
            this.searchResults = []
            this.tileLayers = {}
        },
    }
}
