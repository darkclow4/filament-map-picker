@php
    $fieldWrapperView = $getFieldWrapperView();
    $statePath = $getStatePath();
    $tiles = $getResolvedTiles();
@endphp

<x-dynamic-component :component="$fieldWrapperView" :field="$field">
    <div
        x-load
        x-load-src="{{ \Filament\Support\Facades\FilamentAsset::getAlpineComponentSrc('map-picker', 'darkclow4/filament-map-picker') }}"
        x-data="mapPickerFormComponent({
            statePath: @js($statePath),
            defaultLocation: @js($getDefaultLocation()),
            zoom: @js($getZoom()),
            mode: @js($getMode()),
            tile: @js($getTile()),
            tiles: @js($tiles),
            height: @js($getHeight()),
            isDisabled: @js($isDisabled()),
        })"
        style="--fi-map-picker-marker-color: {{ $getMarkerColor() }};"
        {{
            $getExtraAttributeBag()
                ->class(['fi-map-picker'])
        }}
    >
        <div wire:ignore class="fi-map-picker-map-shell" x-bind:style="`height: ${height}`">
            <div x-ref="map" class="fi-map-picker-map"></div>

            <div x-show="mode === 'drag'" x-cloak class="fi-map-picker-center-marker" aria-hidden="true">
                <div class="fi-map-picker-center-marker-pin"></div>
                <div class="fi-map-picker-center-marker-shadow"></div>
            </div>
        </div>
    </div>
</x-dynamic-component>
