import L from 'leaflet';

export default function mapPickerFormComponent({
    config
}) {
    return {
        init() {
            const mapElement = this.$refs.map;

            this.map = L.map(mapElement).setView(
                [-6.2, 106.8],
                config.zoom
            );

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
            }).addTo(this.map);
        }
    }
}