# Filament Map Picker

`filament-map-picker` is a custom field for Filament 5 that provides an interactive Leaflet.js map for selecting a point location and, optionally, drawing one or more map areas as GeoJSON.

The package is designed to stay flexible. It does not force how you persist `latitude`, `longitude`, or area data. Instead, it keeps a predictable field state and lets you map the values however you want through `afterStateUpdated()` and `afterStateHydrated()`.

## Features

- Built for Filament 5
- Powered by locally bundled Leaflet.js and Leaflet Draw
- Default OpenStreetMap tile layer
- Custom tile support through `->tiles([...])`
- `drag` mode and `click` mode for the point marker
- Optional geocoding search UI
- Optional polygon, rectangle, and circle drawing tools
- Optional multi-shape GeoJSON collections
- Combined point + area state in a single field
- Reactive Livewire-friendly state updates
- Alpine.js powered interaction
- Leaflet layers control for switching tile layers

## Requirements

- PHP 8.3+
- Laravel 13+
- Filament 5

## Installation

Install the package with Composer:

```bash
composer require darkclow4/filament-map-picker
```

Then publish Filament assets:

```bash
php artisan filament:assets
```

## Package Registration

The package supports Laravel auto-discovery through:

```php
Darkclow4\FilamentMapPicker\FilamentMapPickerServiceProvider::class
```

In most applications, no manual provider registration is needed.

## State Format

### Point-only mode

By default, the field stores point coordinates as:

```php
[
    'lat' => -6.2,
    'lng' => 106.816666,
]
```

### Point + draw mode

When draw mode is enabled, the field stores a combined state:

```php
[
    'lat' => -6.2,
    'lng' => 106.816666,
    'geojson' => [
        'type' => 'FeatureCollection',
        'features' => [
            // polygon / rectangle / circle features
        ],
    ],
]
```

This makes it easy to keep a marker location and one or more service-area shapes in the same field while still saving them into separate database columns.

## Basic Usage

### Point-only field

```php
use Darkclow4\FilamentMapPicker\Forms\Components\MapPicker;
use Filament\Schemas\Components\Utilities\Set;

MapPicker::make('location')
    ->mode('click')
    ->defaultLocation(-6.2, 106.816666)
    ->zoom(13)
    ->height(420)
    ->live()
    ->afterStateUpdated(function (?array $state, Set $set): void {
        $set('latitude', $state['lat'] ?? null);
        $set('longitude', $state['lng'] ?? null);
    });
```

### Point + area in a single field

```php
use Darkclow4\FilamentMapPicker\Forms\Components\MapPicker;
use Filament\Forms\Components\Hidden;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;

MapPicker::make('location')
    ->mode('drag')
    ->defaultLocation(-6.2, 106.816666)
    ->drawable()
    ->drawTools(['polygon', 'rectangle', 'circle'])
    ->multipleShapes()
    ->fitDrawBounds(false)
    ->height(480)
    ->live()
    ->afterStateHydrated(function (MapPicker $component, Get $get): void {
        $component->state([
            'lat' => is_numeric($get('latitude')) ? (float) $get('latitude') : -6.2,
            'lng' => is_numeric($get('longitude')) ? (float) $get('longitude') : 106.816666,
            'geojson' => is_array($get('area'))
                ? $get('area')
                : [
                    'type' => 'FeatureCollection',
                    'features' => [],
                ],
        ]);
    })
    ->afterStateUpdated(function (?array $state, Set $set): void {
        $set('latitude', $state['lat'] ?? null);
        $set('longitude', $state['lng'] ?? null);
        $set('area', $state['geojson'] ?? [
            'type' => 'FeatureCollection',
            'features' => [],
        ]);
    });

Hidden::make('area');
```

## Selection Modes

### Drag mode

```php
MapPicker::make('location')->mode('drag')
```

- the user drags the map
- the marker stays centered
- coordinates are taken from the map center

### Click mode

```php
MapPicker::make('location')->mode('click')
```

- the user clicks on the map
- the marker moves to the clicked point
- coordinates are taken from that point

## Default Tile Layer

If you do not provide custom tiles, the field uses OpenStreetMap automatically.

```php
MapPicker::make('location')
    ->tile('osm')
```

Built-in default tile definition:

```php
[
    'osm' => [
        'label' => 'OpenStreetMap',
        'url' => 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'options' => [
            'maxZoom' => 19,
            'attribution' => '&copy; OpenStreetMap contributors',
        ],
    ],
]
```

## Custom Tile Layers

You can provide your own tile layers with `->tiles([...])`. Those definitions are serialized to JSON and passed directly to Leaflet.

```php
MapPicker::make('location')
    ->tiles([
        'opentopo' => [
            'label' => 'Open Topo Map',
            'url' => 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            'options' => [
                'maxZoom' => 19,
                'attribution' => 'Map data: &copy; OpenStreetMap contributors | Map style: &copy; OpenTopoMap',
            ],
        ],
    ])
    ->tile('opentopo');
```

Tile behavior:

- if `->tiles()` is not called, only `osm` is available
- if `->tile()` is not called, `osm` is selected by default
- if the selected tile key is invalid, the field falls back to `osm`
- if more than one base layer exists, Leaflet's built-in layers control is shown on the map
- by default the built-in `osm` tile is always included
- use `->showDefaultTile(false)` if you want to hide the built-in `osm` tile and only expose your custom tiles

## Searchable Mode

Enable geocoding search when you want users to jump quickly to a location:

```php
MapPicker::make('location')
    ->searchable()
    ->searchPlaceholder('Search for a place')
    ->searchResultLimit(8)
```

Behavior:

- users can search for a place or address
- matching results appear in a dropdown list
- selecting a result recenters the map and updates the field state
- selected results are highlighted when reopened

By default, search uses:

```php
https://nominatim.openstreetmap.org/search
```

You can override it:

```php
->searchProviderUrl('https://nominatim.openstreetmap.org/search')
```

## Drawing Shapes as GeoJSON

Enable draw mode when you want the user to define areas while keeping a marker location in the same field state.

```php
MapPicker::make('location')
    ->drawable()
    ->drawTools(['polygon', 'rectangle', 'circle'])
    ->multipleShapes()
    ->fitDrawBounds(false)
```

Notes:

- draw mode stores the field state as `['lat', 'lng', 'geojson']`
- the marker location still works as normal
- the drawn area is stored inside `geojson`
- by default only one drawn shape is kept at a time
- use `->multipleShapes()` if you want multiple polygons / rectangles / circles in the same `FeatureCollection`
- editing or deleting shapes updates the field state automatically
- use `afterStateUpdated()` / `afterStateHydrated()` to map `latitude`, `longitude`, and `geojson` into separate database columns

## API Reference

### `->tile(string $tile)`

Sets the active tile key.

```php
->tile('osm')
```

### `->tiles(array $tiles)`

Registers custom tile layers.

Expected tile format:

```php
[
    'custom-key' => [
        'label' => 'Tile Name',
        'url' => 'https://example.com/{z}/{x}/{y}.png',
        'options' => [
            'maxZoom' => 20,
            'attribution' => '...'
        ],
    ],
]
```

### `->showDefaultTile(bool $condition = true)`

Controls whether the built-in `osm` tile should be included in the available tile list.

```php
->showDefaultTile(false)
```

### `->mode('drag|click')`

Defines the point marker interaction mode.

```php
->mode('drag')
->mode('click')
```

### `->defaultLocation(float $lat, float $lng)`

Sets the initial map coordinates.

```php
->defaultLocation(-6.2, 106.816666)
```

### `->zoom(int $level)`

Sets the initial map zoom level.

```php
->zoom(13)
```

### `->height(int|string $height)`

Sets the map container height.

```php
->height(420)
->height('32rem')
->height('60vh')
```

### `->markerColor(string $color)`

Sets the marker color used in both `drag` and `click` modes.

```php
->markerColor('#0f766e')
->markerColor('rgb(37, 99, 235)')
```

### `->searchable(bool $condition = true)`

Enables place search.

```php
->searchable()
```

### `->searchPlaceholder(string $placeholder)`

Overrides the search input placeholder.

```php
->searchPlaceholder('Search for a city or address')
```

### `->searchProviderUrl(string $url)`

Overrides the geocoding endpoint used by the search box.

```php
->searchProviderUrl('https://nominatim.openstreetmap.org/search')
```

### `->searchResultLimit(int $limit)`

Controls how many search results are shown in the dropdown.

```php
->searchResultLimit(8)
```

### `->drawable(bool $condition = true)`

Enables shape drawing tools and switches the field state into combined point + GeoJSON mode.

```php
->drawable()
```

### `->drawTools(array $tools)`

Controls which draw tools are available. Supported values are `polygon`, `rectangle`, and `circle`.

```php
->drawTools(['polygon', 'rectangle'])
```

### `->fitDrawBounds(bool $condition = true)`

Controls whether the map should automatically fit to the drawn shapes after create or edit.

```php
->fitDrawBounds(false)
```

### `->multipleShapes(bool $condition = true)`

Allows the field to keep multiple drawn shapes inside the GeoJSON `FeatureCollection`.

```php
->multipleShapes()
```

### `->showAreaMeasurement(bool $condition = true)`

Shows area labels directly inside the map for each drawn shape when draw mode is enabled.

```php
->showAreaMeasurement()
```

### `->areaMeasurementUnit('m2'|'ha')`

Controls the unit used for the displayed area measurement.

```php
->areaMeasurementUnit('m2')
->areaMeasurementUnit('ha')
```

## Notes

- The package does not force any persistence strategy for `latitude`, `longitude`, or area GeoJSON
- You are free to map the field state into any schema structure you prefer
- Custom tiles are the developer's responsibility, including availability and usage terms
- Search providers are the developer's responsibility, including availability and usage terms

## License

This package is open-sourced software licensed under the [MIT license](LICENSE).
