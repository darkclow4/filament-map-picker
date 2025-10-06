<?php

namespace Darkclow4\MapPicker\Forms;

use Closure;
use Filament\Forms\Components\Field;

class MapPicker extends Field
{
    protected string $view = 'darkclow4-map-picker::components.map-picker';

    protected int|Closure|null $zoom = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dehydrated(false);
    }

    public function zoom(int|Closure|null $maxZoom): static
    {
        $this->zoom = $maxZoom;

        return $this;
    }

    public function getZoom(): int
    {
        return $this->evaluate($this->zoom) ?? 16;
    }

    public function getMapConfig(): string
    {
        return json_encode([
            'zoom' => $this->getZoom(),
        ]);
    }
}
