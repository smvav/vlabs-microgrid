import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Microgrid Digital Twin | Energy Scheduler",
    description: "24-Hour Energy Scheduler & Digital Twin for Microgrid System - Virtual Labs",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
