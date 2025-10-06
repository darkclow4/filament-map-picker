<x-dynamic-component :component="$getFieldWrapperView()" :field="$field">
    <div
    x-load
    x-load-src="{{ \Filament\Support\Facades\FilamentAsset::getAlpineComponentSrc('map-picker', 'darkclow4/filament-map-picker') }}"
    x-data="mapPickerFormComponent({
                config: {{ $getMapConfig() }},
            })"
    wire:ignore
    >
        <div x-ref="map" style="height: 200px;"></div>
    </div>
</x-dynamic-component>
