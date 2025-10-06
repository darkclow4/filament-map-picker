import L from 'leaflet';

export default function mapPickerFormComponent({
    config
}) {
    return {
        map: null,
        baseTileLayer: null,
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

        }
    }
}