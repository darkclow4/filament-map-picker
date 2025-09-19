<?php

namespace Darkclow4\MapPicker\Forms;

use Filament\Forms\Components\Field;

class MapPicker extends Field
{
    /**
     * @var view-string
     */
    protected string $view = 'darkclow4-map-picker::components.map-picker';

    protected function setUp(): void
    {
        parent::setUp();
    }
}
