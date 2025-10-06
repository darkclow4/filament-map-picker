<?php

namespace Darkclow4\MapPicker\Forms;

use Closure;
use Filament\Forms\Components\Field;

class MapPicker extends Field
{
    protected string $view = 'darkclow4-map-picker::components.map-picker';

    protected int|Closure|null $zoom = null;

    protected int|Closure|null $maxZoom = null;

    protected array|Closure|null $center = null;

    protected array|Closure|null $tileLayer = null;

    protected string|Closure|null $defaultTile = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dehydrated(false);
    }

    public function center(array|string|Closure|null $latLong): static
    {
        if (is_string($latLong) && strpos($latLong, ',') !== false) {
            $latLong = explode(',', $latLong);
            $latLong = array_map(fn ($item) => trim($item), $latLong);
        }

        $this->center = $latLong;

        return $this;
    }

    public function zoom(int|Closure|null $zoom): static
    {
        $this->zoom = $zoom;

        return $this;
    }

    public function maxZoom(int|Closure|null $maxZoom): static
    {
        $this->maxZoom = $maxZoom;

        return $this;
    }

    public function tileLayer(array|Closure|null $tileLayer): static
    {
        $this->tileLayer = $tileLayer;

        return $this;
    }

    public function defaultTile(string|Closure|null $defaultTile): static
    {
        $this->defaultTile = $defaultTile;

        return $this;
    }

    public function getCenter(): array
    {
        return $this->evaluate($this->center) ?? ['-0.49663285005748353', '117.1439834912708'];
    }

    public function getZoom(): int
    {
        return $this->evaluate($this->zoom) ?? 16;
    }

    public function getMaxZoom(): int
    {
        return $this->evaluate($this->maxZoom) ?? 18;
    }

    public function getTileLayer(): array
    {
        return $this->evaluate($this->tileLayer) ?? [
            'osm' => [
                'label' => 'OpenStreetMap',
                'url' => 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'attribution' => '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            ],
        ];
    }

    public function getDefaultTile(): string
    {
        return $this->evaluate($this->defaultTile) ?? array_keys($this->getTileLayer())[0];
    }

    public function getMapConfig(): string
    {
        return json_encode([
            'center' => $this->getCenter(),
            'zoom' => $this->getZoom(),
            'maxZoom' => $this->getMaxZoom(),
            'tileLayer' => $this->getTileLayer(),
            'defaultTile' => $this->getDefaultTile(),
        ]);
    }
}
