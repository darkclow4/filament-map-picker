import L from 'leaflet';

export default function mapPickerFormComponent({
    config
}) {
    return {
        map: null,
        init() {
            const tileLayer = config.tileLayer;
            const baseTileLayer = {};
            const mapElement = this.$refs.map;

            for (const tile in tileLayer) {
                const cfg = tileLayer[tile];
                const { label, url, ...options } = cfg;
                baseTileLayer[label] = L.tileLayer(url, options);
            }

            this.map = L.map(mapElement, {
                center: config.center,
                zoom: config.zoom,
                maxZoom: config.maxZoom,
                layers: [baseTileLayer[tileLayer[config.defaultTile].label]]
            });

            if (Object.keys(tileLayer).length > 1) {
                L.control.layers(baseTileLayer).addTo(this.map);
            }

        }
    }
}