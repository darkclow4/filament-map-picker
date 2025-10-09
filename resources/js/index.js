import L from 'leaflet';
import 'leaflet-draw';

export default function mapPickerFormComponent({
    config
}) {
    return {
        map: null,
        baseTileLayer: null,
        marker: null,
        init() {
            const tileLayer = config.tileLayer;
            const mapElement = this.$refs.map;

            this.baseTileLayer = {};

            for (const tile in tileLayer) {
                const cfg = tileLayer[tile];
                const { label, url, ...options } = cfg;
                this.baseTileLayer[label] = L.tileLayer(url, options);
            }

            this.map = L.map(mapElement, {
                center: config.center,
                zoom: config.zoom,
                maxZoom: config.maxZoom,
                layers: [this.baseTileLayer[tileLayer[config.defaultTile].label]]
            });

            if (Object.keys(tileLayer).length > 1) {
                L.control.layers(this.baseTileLayer).addTo(this.map);
            }

            this.$nextTick(() => {
                setTimeout(() => this.map.invalidateSize(), 300);
            });

            const markerLayer = L.layerGroup().addTo(this.map);

            const onMapClick = (e) => {
                if (this.marker) {
                    this.marker.setLatLng(e.latlng);
                } else {
                    this.marker = L.marker(e.latlng).addTo(markerLayer);
                }
            };

            this.map.on('click', onMapClick);

            const drawnItems = new L.FeatureGroup();
            this.map.addLayer(drawnItems);

            const drawControl = new L.Control.Draw({
                edit: {
                    featureGroup: drawnItems,
                    remove: true
                },
                draw: {
                    polygon: true,
                    marker: false,
                    polyline: false,
                    rectangle: false,
                    circle: false,
                    circlemarker: false
                }
            });
            this.map.addControl(drawControl);
        }
    }
}