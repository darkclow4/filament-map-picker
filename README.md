# Filament Map Picker

`filament-map-picker` is a custom field for Filament 5 that lets users pick map coordinates with an interactive Leaflet.js map.

The field does not directly persist `latitude` and `longitude` columns. Instead, it keeps an internal coordinate state and lets developers map that state however they want through `afterStateUpdated()`.

## Features

- Built for Filament 5
- Powered by Leaflet.js
- Default OpenStreetMap tile layer
- Custom tile support through `->tiles([...])`
- `drag` mode and `click` mode
- Reactive Livewire state
- Alpine.js powered interaction
- Leaflet layers control for switching tile layers

## Requirements

- PHP 8.3+
- Laravel 13+
- Filament 5

## Installation

If you are developing the package locally inside a Laravel project, add a path repository to the root `composer.json`:

```json
{
    "repositories": [
        {
            "type": "path",
            "url": "packages/filament-map-picker"
        }
    ]
}
```

Then require the package:

```bash
composer require darkclow4/filament-map-picker:@dev
```

After installation, publish Filament assets:

```bash
php artisan filament:assets
```

## Runtime vs Development Dependencies

The published package does not need `node_modules` at runtime.

- Laravel and Filament only use the committed files inside `dist/`
- `node_modules` is only needed when maintaining the package locally
- This means consumers of the package do not need Node.js just to use the field

In short:

- runtime usage: no `node_modules` required
- package maintenance: `node_modules` required only when rebuilding assets or updating bundled Leaflet

## Package Registration

The package supports Laravel auto-discovery through:

```php
Darkclow4\FilamentMapPicker\FilamentMapPickerServiceProvider::class
```

In most applications, no manual provider registration is needed.

## Basic Usage

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

## How the Field State Works

The field stores its internal state as an array:

```php
[
    'lat' => -6.2,
    'lng' => 106.816666,
]
```

This makes it easy to map the selected coordinates to separate form fields or database columns.

## Selection Modes

### Drag Mode

```php
MapPicker::make('location')->mode('drag')
```

- The user drags the map
- The marker stays centered
- Coordinates are taken from the map center

### Click Mode

```php
MapPicker::make('location')->mode('click')
```

- The user clicks on the map
- The marker moves to the clicked point
- Coordinates are taken from that point

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

You can provide your own tile layers with `->tiles([...])`. Those tiles are serialized to JSON and passed directly to Leaflet.

```php
MapPicker::make('location')
    ->tiles([
        'opentopo' => [
            'label' => 'Open Topo Map',
            'url' => 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            'options' => [
                'maxZoom' => 19,
                'attribution' => 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
            ],
        ],
    ])
    ->tile('opentopo');
```

Tile behavior:

- If `->tiles()` is not called, only `osm` is available
- If `->tile()` is not called, `osm` is selected by default
- If the selected tile key is invalid, the field falls back to `osm`
- If more than one base layer exists, Leaflet's built-in layers control is shown on the map

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

### `->mode('drag|click')`

Defines the map interaction mode.

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

## Example: Filament Form Integration

```php
<?php

namespace App\Filament\Resources\Organizations\Schemas;

use Darkclow4\FilamentMapPicker\Forms\Components\MapPicker;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Schema;

class OrganizationForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required(),

                MapPicker::make('location')
                    ->columnSpanFull()
                    ->tiles([
                        'opentopo' => [
                            'label' => 'Open Topo Map',
                            'url' => 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                            'options' => [
                                'maxZoom' => 19,
                                'attribution' => 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                            ],
                        ],
                    ])
                    ->tile('opentopo')
                    ->mode('click')
                    ->defaultLocation(-6.2, 106.816666)
                    ->markerColor('#2563eb')
                    ->zoom(13)
                    ->height(420)
                    ->live()
                    ->afterStateHydrated(function (MapPicker $component, Get $get): void {
                        $latitude = $get('latitude');
                        $longitude = $get('longitude');

                        if (! is_numeric($latitude) || ! is_numeric($longitude)) {
                            return;
                        }

                        $component->state([
                            'lat' => (float) $latitude,
                            'lng' => (float) $longitude,
                        ]);
                    })
                    ->afterStateUpdated(function (?array $state, Set $set): void {
                        $set('latitude', $state['lat'] ?? null);
                        $set('longitude', $state['lng'] ?? null);
                    }),

                TextInput::make('latitude')
                    ->numeric()
                    ->live(debounce: 500)
                    ->afterStateUpdated(function ($state, Get $get, Set $set): void {
                        $longitude = $get('longitude');

                        if (! is_numeric($state) || ! is_numeric($longitude)) {
                            return;
                        }

                        $set('location', [
                            'lat' => (float) $state,
                            'lng' => (float) $longitude,
                        ]);
                    }),

                TextInput::make('longitude')
                    ->numeric()
                    ->live(debounce: 500)
                    ->afterStateUpdated(function ($state, Get $get, Set $set): void {
                        $latitude = $get('latitude');

                        if (! is_numeric($latitude) || ! is_numeric($state)) {
                            return;
                        }

                        $set('location', [
                            'lat' => (float) $latitude,
                            'lng' => (float) $state,
                        ]);
                    }),
            ]);
    }
}
```

This example gives you two-way synchronization:

- clicking or dragging the map updates `latitude` and `longitude`
- editing `latitude` and `longitude` manually updates the map position
- editing an existing record restores the map position from stored coordinates via `afterStateHydrated()`

## Asset Loading

- Leaflet CSS is bundled and served locally by the package
- Leaflet JS is bundled and served locally by the package
- Package CSS and Alpine assets are registered through Filament assets

After updating package assets during development, republish them with:

```bash
php artisan filament:assets
```

## Building Assets

This package includes its own package-local Node.js tooling for rebuilding minified assets.

Install development dependencies inside the package directory:

```bash
cd packages/filament-map-picker
npm install
```

Build minified package assets:

```bash
npm run build
```

This regenerates:

- `dist/components/map-picker.js`
- `dist/map-picker.css`

## Updating the Bundled Leaflet Version

Leaflet is bundled locally so the package does not rely on a CDN. When you want to update Leaflet:

```bash
cd packages/filament-map-picker
npm install leaflet@latest --save-dev
npm run update:leaflet
npm run build
```

This workflow:

- updates the package-local Leaflet dependency
- copies Leaflet into `dist/leaflet/`
- embeds Leaflet image assets into the CSS
- minifies the bundled Leaflet CSS
- rebuilds the package JS and CSS

After that, republish Filament assets in the Laravel app:

```bash
php artisan filament:assets
```

## Notes

- The package does not force any persistence strategy for `latitude` and `longitude`
- You are free to map the field state into any schema structure you prefer
- Custom tiles are the developer's responsibility, including availability and usage terms

## License

This package is open-sourced software licensed under the [MIT license](LICENSE).
