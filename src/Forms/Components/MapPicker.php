<?php

namespace Darkclow4\FilamentMapPicker\Forms\Components;

use Closure;
use Filament\Forms\Components\Field;
use InvalidArgumentException;

class MapPicker extends Field
{
    protected string $view = 'filament-map-picker::forms.components.map-picker';

    protected string|Closure|null $tile = null;

    /**
     * @var array<string, array<string, mixed>> | Closure | null
     */
    protected array|Closure|null $tiles = null;

    protected string|Closure|null $mode = null;

    protected float|Closure|null $defaultLatitude = null;

    protected float|Closure|null $defaultLongitude = null;

    protected int|Closure|null $zoom = null;

    protected int|string|Closure|null $height = null;

    protected string|Closure|null $markerColor = null;

    protected bool|Closure $isSearchable = false;

    protected bool|Closure $hasDefaultTile = true;

    protected string|Closure|null $searchPlaceholder = null;

    protected string|Closure|null $searchProviderUrl = null;

    protected int|Closure|null $searchResultLimit = null;

    protected bool|Closure $shouldFitDrawBounds = true;

    protected bool|Closure $allowsMultipleShapes = false;

    protected bool|Closure $shouldShowAreaMeasurement = false;

    protected string|Closure|null $areaMeasurementUnit = null;

    protected bool|Closure $isDrawable = false;

    /**
     * @var array<int, string>|Closure|null
     */
    protected array|Closure|null $drawTools = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tile('osm');
        $this->mode('drag');
        $this->defaultLocation(-6.2, 106.816666);
        $this->zoom(13);
        $this->height(400);
        $this->markerColor('#e11d48');
        $this->searchPlaceholder('Search for a place...');
        $this->searchProviderUrl('https://nominatim.openstreetmap.org/search');
        $this->searchResultLimit(5);
        $this->drawTools(['polygon', 'rectangle', 'circle']);
        $this->fitDrawBounds();
        $this->multipleShapes(false);
        $this->showAreaMeasurement(false);
        $this->areaMeasurementUnit('m2');

        $this->default(fn (MapPicker $component): array => $component->getInitialState());
    }

    public function tile(string|Closure|null $tile): static
    {
        $this->tile = $tile;

        return $this;
    }

    /**
     * @param  array<string, array<string, mixed>> | Closure | null  $tiles
     */
    public function tiles(array|Closure|null $tiles): static
    {
        $this->tiles = $tiles;

        return $this;
    }

    public function mode(string|Closure $mode): static
    {
        $this->mode = $mode;

        return $this;
    }

    public function defaultLocation(float|Closure $lat, float|Closure $lng): static
    {
        $this->defaultLatitude = $lat;
        $this->defaultLongitude = $lng;

        return $this;
    }

    public function zoom(int|Closure $zoom): static
    {
        $this->zoom = $zoom;

        return $this;
    }

    public function height(int|string|Closure $height): static
    {
        $this->height = $height;

        return $this;
    }

    public function markerColor(string|Closure|null $color): static
    {
        $this->markerColor = $color;

        return $this;
    }

    public function searchable(bool|Closure $condition = true): static
    {
        $this->isSearchable = $condition;

        return $this;
    }

    public function showDefaultTile(bool|Closure $condition = true): static
    {
        $this->hasDefaultTile = $condition;

        return $this;
    }

    public function searchPlaceholder(string|Closure|null $placeholder): static
    {
        $this->searchPlaceholder = $placeholder;

        return $this;
    }

    public function searchProviderUrl(string|Closure|null $url): static
    {
        $this->searchProviderUrl = $url;

        return $this;
    }

    public function searchResultLimit(int|Closure|null $limit): static
    {
        $this->searchResultLimit = $limit;

        return $this;
    }

    public function fitDrawBounds(bool|Closure $condition = true): static
    {
        $this->shouldFitDrawBounds = $condition;

        return $this;
    }

    public function multipleShapes(bool|Closure $condition = true): static
    {
        $this->allowsMultipleShapes = $condition;

        return $this;
    }

    public function drawable(bool|Closure $condition = true): static
    {
        $this->isDrawable = $condition;

        return $this;
    }

    /**
     * @param  array<int, string>|Closure|null  $tools
     */
    public function drawTools(array|Closure|null $tools): static
    {
        $this->drawTools = $tools;

        return $this;
    }

    public function showAreaMeasurement(bool|Closure $condition = true): static
    {
        $this->shouldShowAreaMeasurement = $condition;

        return $this;
    }

    public function areaMeasurementUnit(string|Closure|null $unit): static
    {
        $this->areaMeasurementUnit = $unit;

        return $this;
    }

    public function getTile(): string
    {
        $tile = $this->evaluate($this->tile) ?? 'osm';

        if (! is_string($tile) || $tile === '') {
            return 'osm';
        }

        if (! array_key_exists($tile, $this->getResolvedTiles())) {
            return 'osm';
        }

        return $tile;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function getTiles(): array
    {
        return $this->evaluate($this->tiles) ?? [];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function getResolvedTiles(): array
    {
        $tiles = $this->normalizeTiles($this->getTiles());

        if ($this->hasDefaultTile()) {
            return array_replace($this->getDefaultTiles(), $tiles);
        }

        return $tiles;
    }

    public function getMode(): string
    {
        $mode = $this->evaluate($this->mode) ?? 'drag';

        if (! in_array($mode, ['drag', 'click'], true)) {
            throw new InvalidArgumentException('MapPicker mode must be either [drag] or [click].');
        }

        return $mode;
    }

    /**
     * @return array{lat: float, lng: float}
     */
    public function getDefaultLocation(): array
    {
        return [
            'lat' => (float) ($this->evaluate($this->defaultLatitude) ?? -6.2),
            'lng' => (float) ($this->evaluate($this->defaultLongitude) ?? 106.816666),
        ];
    }

    public function getZoom(): int
    {
        return (int) ($this->evaluate($this->zoom) ?? 13);
    }

    public function getHeight(): string
    {
        $height = $this->evaluate($this->height) ?? 400;

        if (is_int($height) || ctype_digit((string) $height)) {
            return $height.'px';
        }

        return (string) $height;
    }

    public function getMarkerColor(): string
    {
        $color = $this->evaluate($this->markerColor) ?? '#e11d48';

        return is_string($color) && trim($color) !== ''
            ? trim($color)
            : '#e11d48';
    }

    public function isSearchable(): bool
    {
        return (bool) $this->evaluate($this->isSearchable);
    }

    public function hasDefaultTile(): bool
    {
        return (bool) $this->evaluate($this->hasDefaultTile);
    }

    public function getSearchPlaceholder(): string
    {
        $placeholder = $this->evaluate($this->searchPlaceholder) ?? 'Search for a place...';

        return is_string($placeholder) && trim($placeholder) !== ''
            ? trim($placeholder)
            : 'Search for a place...';
    }

    public function getSearchProviderUrl(): string
    {
        $url = $this->evaluate($this->searchProviderUrl) ?? 'https://nominatim.openstreetmap.org/search';

        return is_string($url) && trim($url) !== ''
            ? trim($url)
            : 'https://nominatim.openstreetmap.org/search';
    }

    public function getSearchResultLimit(): int
    {
        $limit = (int) ($this->evaluate($this->searchResultLimit) ?? 5);

        return max($limit, 1);
    }

    public function shouldFitDrawBounds(): bool
    {
        return (bool) $this->evaluate($this->shouldFitDrawBounds);
    }

    public function allowsMultipleShapes(): bool
    {
        return (bool) $this->evaluate($this->allowsMultipleShapes);
    }

    public function isDrawable(): bool
    {
        return (bool) $this->evaluate($this->isDrawable);
    }

    public function shouldShowAreaMeasurement(): bool
    {
        return (bool) $this->evaluate($this->shouldShowAreaMeasurement);
    }

    public function getAreaMeasurementUnit(): string
    {
        $unit = $this->evaluate($this->areaMeasurementUnit) ?? 'm2';

        return in_array($unit, ['m2', 'ha'], true) ? $unit : 'm2';
    }

    /**
     * @return array<int, string>
     */
    public function getDrawTools(): array
    {
        return $this->normalizeDrawTools($this->evaluate($this->drawTools) ?? ['polygon', 'rectangle', 'circle']);
    }

    /**
     * @return array<string, mixed>
     */
    public function getInitialState(): array
    {
        if ($this->isDrawable()) {
            return [
                'lat' => $this->getDefaultLocation()['lat'],
                'lng' => $this->getDefaultLocation()['lng'],
                'geojson' => $this->getEmptyGeoJson(),
            ];
        }

        return $this->getDefaultLocation();
    }

    /**
     * @return array<string, mixed>
     */
    public function getEmptyGeoJson(): array
    {
        return [
            'type' => 'FeatureCollection',
            'features' => [],
        ];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    protected function getDefaultTiles(): array
    {
        return [
            'osm' => [
                'label' => 'OpenStreetMap',
                'url' => 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'options' => [
                    'maxZoom' => 19,
                    'attribution' => '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                ],
            ],
        ];
    }

    /**
     * @param  array<string, array<string, mixed>>  $tiles
     * @return array<string, array<string, mixed>>
     */
    protected function normalizeTiles(array $tiles): array
    {
        $normalized = [];

        foreach ($tiles as $key => $tile) {
            if (! is_array($tile)) {
                continue;
            }

            $url = $tile['url'] ?? null;

            if (! is_string($url) || trim($url) === '') {
                continue;
            }

            $label = $tile['label'] ?? null;

            $normalized[$key] = [
                'label' => is_string($label) && trim($label) !== ''
                    ? $label
                    : (string) $key,
                'url' => $url,
                'options' => is_array($tile['options'] ?? null)
                    ? $tile['options']
                    : [],
            ];
        }

        return $normalized;
    }

    /**
     * @param  array<int, string>  $tools
     * @return array<int, string>
     */
    protected function normalizeDrawTools(array $tools): array
    {
        $allowed = ['polygon', 'rectangle', 'circle'];

        return array_values(array_unique(array_filter($tools, fn (mixed $tool): bool => is_string($tool) && in_array($tool, $allowed, true))));
    }
}
