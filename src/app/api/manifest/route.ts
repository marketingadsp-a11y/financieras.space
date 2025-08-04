
import { getAppSettings } from "@/services/app-settings-service";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const settings = await getAppSettings();

        // Get app name from localStorage as a fallback, but prioritize DB settings
        const appName = settings?.pwaSettings?.shortName || "Panel";
        const iconUrl = settings?.pwaSettings?.iconUrl;

        const manifest = {
            theme_color: "#007bff",
            background_color: "#ffffff",
            display: "standalone",
            scope: "/",
            start_url: "/",
            name: appName,
            short_name: appName.substring(0, 12),
            description: `${appName} - Panel de Administración`,
            icons: [
                { src: iconUrl || '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                { src: iconUrl || '/icon-256x256.png', sizes: '256x256', type: 'image/png', purpose: 'any' },
                { src: iconUrl || '/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
                { src: iconUrl || '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
            ],
        };

        return new NextResponse(JSON.stringify(manifest), {
            status: 200,
            headers: {
                "Content-Type": "application/manifest+json",
            },
        });
    } catch (error) {
        console.error("Failed to generate manifest:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
