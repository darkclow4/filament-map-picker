<?php

namespace Darkclow4\MapPicker;

use Filament\Support\Assets\Css;
use Filament\Support\Facades\FilamentAsset;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class MapPickerServiceProvider extends PackageServiceProvider
{
    public static string $name = 'filament-map-picker';

    public static string $viewNamespace = 'darkclow4-map-picker::';

    public function configurePackage(Package $package): void
    {
        $package->name(static::$name);

        if (file_exists($package->basePath('/../resources/lang'))) {
            $package->hasTranslations();
        }

        if (file_exists($package->basePath('/../resources/views'))) {
            $package->hasViews(static::$viewNamespace);
        }
    }

    public function packageBooted(): void
    {
        FilamentAsset::register([
            Css::make('map-picker', __DIR__.'/../resources/dist/map-picker.css')->loadedOnRequest(),
        ], 'darkclow4/filament-map-picker');
    }
}
