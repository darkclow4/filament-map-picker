<?php

namespace Darkclow4\FilamentMapPicker;

use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Assets\Css;
use Filament\Support\Assets\Js;
use Filament\Support\Facades\FilamentAsset;
use Filament\Support\Facades\FilamentView;
use Filament\View\PanelsRenderHook;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class FilamentMapPickerServiceProvider extends PackageServiceProvider
{
    public function configurePackage(Package $package): void
    {
        $package
            ->name('filament-map-picker')
            ->hasViews();
    }

    public function packageBooted(): void
    {
        FilamentAsset::register([
            Js::make('leaflet', __DIR__.'/../dist/leaflet/leaflet.js'),
            Css::make('leaflet', __DIR__.'/../dist/leaflet/leaflet.css'),
            AlpineComponent::make('map-picker', __DIR__.'/../dist/components/map-picker.js'),
            Css::make('map-picker', __DIR__.'/../dist/map-picker.css'),
        ], 'darkclow4/filament-map-picker');

        FilamentView::registerRenderHook(
            PanelsRenderHook::STYLES_AFTER,
            fn (): string => \view('filament-map-picker::assets.leaflet-styles')->render(),
        );

        FilamentView::registerRenderHook(
            PanelsRenderHook::SCRIPTS_AFTER,
            fn (): string => \view('filament-map-picker::assets.leaflet-scripts')->render(),
        );
    }
}
