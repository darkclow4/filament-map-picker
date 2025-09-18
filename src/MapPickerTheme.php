<?php

namespace Darkclow4\MapPicker;

use Filament\Contracts\Plugin;
use Filament\Panel;
use Filament\Support\Assets\Theme;
use Filament\Support\Color;
use Filament\Support\Facades\FilamentAsset;

class MapPicker implements Plugin
{
    public function getId(): string
    {
        return 'filament-map-picker';
    }

    public function register(Panel $panel): void
    {
        FilamentAsset::register([
            Theme::make('filament-map-picker', __DIR__ . '/../resources/dist/filament-map-picker.css'),
        ]);

        $panel
            ->font('DM Sans')
            ->primaryColor(Color::Amber)
            ->secondaryColor(Color::Gray)
            ->warningColor(Color::Amber)
            ->dangerColor(Color::Rose)
            ->successColor(Color::Green)
            ->grayColor(Color::Gray)
            ->theme('filament-map-picker');
    }

    public function boot(Panel $panel): void
    {
        //
    }
}
