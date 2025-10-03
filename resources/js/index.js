import L from 'leaflet';

export default function mapPickerFormComponent({

}) {
    return {
        init() {
            const mapElement = this.$refs.map;

            this.map = L.map(mapElement).setView(
                [-6.2, 106.8],
                13
            );

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
            }).addTo(this.map);
        }
    }
}