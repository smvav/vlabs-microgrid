"use client";

/**
 * VLabs Microgrid Simulation Page
 * ===============================
 * Interactive simulation inspired by IIT-D Virtual Labs.
 * Uses Three.js for 3D visualization, D3.js for charts, and p5.js for animations.
 */

import React from "react";
import dynamic from "next/dynamic";

// Dynamic imports for client-side only components
const VLabsSimulation = dynamic(() => import("@/components/VLabsSimulation"), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
            <div className="text-white text-xl">Loading Simulation...</div>
        </div>
    ),
});

export default function VLabsSimulationPage() {
    return <VLabsSimulation />;
}
