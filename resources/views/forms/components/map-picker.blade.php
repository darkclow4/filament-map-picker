@php
    $fieldWrapperView = $getFieldWrapperView();
    $statePath = $getStatePath();
    $tiles = $getResolvedTiles();
@endphp

<x-dynamic-component :component="$fieldWrapperView" :field="$field">
    <link rel="stylesheet" href="{{ \Filament\Support\Facades\FilamentAsset::getStyleHref('leaflet', 'darkclow4/filament-map-picker') }}" data-navigate-track />
    @if ($isDrawable())
        <link rel="stylesheet" href="{{ \Filament\Support\Facades\FilamentAsset::getStyleHref('leaflet-draw', 'darkclow4/filament-map-picker') }}" data-navigate-track />
    @endif

    <div x-load
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
            isSearchable: @js($isSearchable()),
            searchProviderUrl: @js($getSearchProviderUrl()),
            searchResultLimit: @js($getSearchResultLimit()),
            isDrawable: @js($isDrawable()),
            drawTools: @js($getDrawTools()),
            emptyGeoJson: @js($getEmptyGeoJson()),
            shouldFitDrawBounds: @js($shouldFitDrawBounds()),
            allowsMultipleShapes: @js($allowsMultipleShapes()),
            shouldShowAreaMeasurement: @js($shouldShowAreaMeasurement()),
            areaMeasurementUnit: @js($getAreaMeasurementUnit()),
            leafletScriptUrl: @js(\Filament\Support\Facades\FilamentAsset::getScriptSrc('leaflet', 'darkclow4/filament-map-picker')),
            leafletDrawScriptUrl: @js(\Filament\Support\Facades\FilamentAsset::getScriptSrc('leaflet-draw', 'darkclow4/filament-map-picker')),
        })" style="--fi-map-picker-marker-color: {{ $getMarkerColor() }};"
        {{ $getExtraAttributeBag()->class(['fi-map-picker']) }}>
        @if ($isSearchable())
            <div class="fi-map-picker-search">
                <div class="fi-map-picker-search-panel">
                    <div class="fi-map-picker-search-header">
                        <button type="button" class="fi-map-picker-search-toggle"
                            x-show="searchResults.length && !isSearching" x-cloak x-on:click="toggleSearchResults()"
                            x-text="searchResultsOpen ? 'Hide results' : 'Show results'"></button>
                    </div>

                    <div class="fi-map-picker-search-input-wrap">
                        <div class="fi-map-picker-search-input-shell">
                            <svg class="fi-map-picker-search-icon" viewBox="0 0 20 20" fill="currentColor"
                                aria-hidden="true">
                                <path fill-rule="evenodd"
                                    d="M9 3.5a5.5 5.5 0 1 0 3.473 9.765l3.63 3.631a.75.75 0 1 0 1.06-1.061l-3.63-3.63A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0a4 4 0 0 1-8 0Z"
                                    clip-rule="evenodd" />
                            </svg>

                            <input x-model="searchQuery" x-on:keydown.enter.prevent="performSearch()" type="text"
                                placeholder="{{ $getSearchPlaceholder() }}" class="fi-map-picker-search-input"
                                x-on:focus="if (searchResults.length) searchResultsOpen = true"
                                x-bind:disabled="isDisabled || isSearching" />
                        </div>

                        <button type="button" class="fi-map-picker-search-button" x-on:click="performSearch()"
                            x-bind:disabled="isDisabled || isSearching || !searchQuery.trim().length">
                            <span x-show="!isSearching">Search</span>
                            <span x-show="isSearching" x-cloak>Searching...</span>
                        </button>
                    </div>

                    <p x-show="searchError" x-cloak
                        class="fi-map-picker-search-feedback fi-map-picker-search-feedback-error" x-text="searchError">
                    </p>

                    <p x-show="searchResultLabel" x-cloak
                        class="fi-map-picker-search-feedback fi-map-picker-search-feedback-success"
                        x-text="searchResultLabel"></p>

                    <div x-show="searchResultsOpen && searchResults.length" x-cloak
                        x-transition.opacity.scale.origin.top class="fi-map-picker-search-results">
                        <template x-for="(result, index) in searchResults"
                            :key="`${result.lat}-${result.lng}-${index}`">
                            <button type="button" class="fi-map-picker-search-result"
                                x-bind:class="{ 'fi-map-picker-search-result-active': isSearchResultActive(result) }"
                                x-on:click.prevent.stop="selectSearchResult(result)">
                                <span class="fi-map-picker-search-result-index" x-text="index + 1"></span>
                                <span class="fi-map-picker-search-result-body">
                                    <strong x-text="result.label"></strong>
                                    <small x-text="`${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}`"></small>
                                </span>
                            </button>
                        </template>
                    </div>
                </div>
            </div>
        @endif

        <div wire:ignore class="fi-map-picker-map-shell" x-bind:style="`height: ${height}`">
            <div x-ref="map" class="fi-map-picker-map"></div>

            <div x-show="mode === 'drag'" x-cloak class="fi-map-picker-center-marker" aria-hidden="true">
                <div class="fi-map-picker-center-marker-pin"></div>
                <div class="fi-map-picker-center-marker-shadow"></div>
            </div>
        </div>
    </div>
</x-dynamic-component>
