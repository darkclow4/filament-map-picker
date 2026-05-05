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

    protected function setUp(): void
    {
        parent::setUp();

        $this->tile('osm');
        $this->mode('drag');
        $this->defaultLocation(-6.2, 106.816666);
        $this->zoom(13);
        $this->height(400);
        $this->markerColor('#e11d48');

        $this->default(fn (MapPicker $component): array => $component->getDefaultLocation());
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
        return array_replace($this->getDefaultTiles(), $this->normalizeTiles($this->getTiles()));
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
                    'attribution' => '&copy; OpenStreetMap contributors',
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
}
