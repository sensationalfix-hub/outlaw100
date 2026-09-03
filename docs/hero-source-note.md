# Dashboard hero image source

The rotating dashboard hero pool uses the Red Dead Redemption 2 1920×1080 wallpaper collection published by PlayStation Universe:

https://www.psu.com/wallpapers/red-dead-redemption-2-wallpapers/

The runtime keeps explicit URLs in `src/features/dashboard/hero-images.ts`, uses `referrerPolicy="no-referrer"`, and falls back to the project's bundled legacy RDR2 image if an external asset becomes unavailable.
