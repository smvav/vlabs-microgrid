"use client";

/**
 * Dashboard Component
 * ===================
 * Main container for the Microgrid Digital Twin interface.
 * Orchestrates all child components and manages simulation state.
 * Features: p5.js animation, Chart.js gauges, Recharts visualization
 */

import React, { useState, useCallback, useEffect } from "react";
import { Cpu, Activity, Zap } from "lucide-react";
import dynamic from "next/dynamic";
import ControlPanel from "./ControlPanel";
import ComparisonCard from "./ComparisonCard";
import EnergyChart from "./EnergyChart";
import PowerGauge from "./PowerGauge";

// Dynamic import for p5.js component (client-side only)
const MicrogridAnimation = dynamic(() => import("./MicrogridAnimation"), {
    ssr: false,
    loading: () => (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl border border-slate-700/50 p-6 h-[500px] flex items-center justify-center">
            <div className="text-slate-400">Loading animation...</div>
        </div>
    ),
});

// API Base URL - adjust for production
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface HourlyData {
    hour: number;
    solar_generation: number;
    load_demand: number;
    battery_soc: number;
    grid_usage: number;
    is_peak_hour: boolean;
    battery_charge: number;
    battery_discharge: number;
}

interface Summary {
    baseline_total_cost: number;
    smart_total_cost: number;
    cost_saved: number;
    cost_saved_percent: number;
    baseline_grid_usage: number;
    smart_grid_usage: number;
    grid_reduced: number;
    grid_reduced_percent: number;
    battery_capacity_kwh: number;
}

interface SimulationResult {
    baseline_data: HourlyData[];
    smart_data: HourlyData[];
    summary: Summary;
}

export default function Dashboard() {
    // Simulation parameters - Delhi BSES/TPDDL defaults
    const [batteryCapacity, setBatteryCapacity] = useState(10);
    const [peakPrice, setPeakPrice] = useState(8);      // ₹/kWh peak
    const [offPeakPrice, setOffPeakPrice] = useState(5); // ₹/kWh off-peak

    // Simulation state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<SimulationResult | null>(null);

    // Animation state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentHour, setCurrentHour] = useState(0);

    // Animation playback effect
    useEffect(() => {
        if (!isPlaying || !result) return;

        const interval = setInterval(() => {
            setCurrentHour((prev) => (prev + 1) % 24);
        }, 1000); // 1 second per hour

        return () => clearInterval(interval);
    }, [isPlaying, result]);

    // Reset to Delhi defaults
    const handleReset = useCallback(() => {
        setBatteryCapacity(10);
        setPeakPrice(8);      // ₹/kWh
        setOffPeakPrice(5);   // ₹/kWh
        setResult(null);
        setError(null);
        setCurrentHour(0);
        setIsPlaying(false);
    }, []);

    // Run simulation
    const handleSimulate = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/simulate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    battery_capacity_kwh: batteryCapacity,
                    peak_price: peakPrice,
                    off_peak_price: offPeakPrice,
                    initial_soc: 0.5,
                }),
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data: SimulationResult = await response.json();
            setResult(data);
            setCurrentHour(0);
            setIsPlaying(true); // Auto-start animation on simulation
        } catch (err) {
            console.error("Simulation error:", err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to connect to simulation server"
            );
        } finally {
            setIsLoading(false);
        }
    }, [batteryCapacity, peakPrice, offPeakPrice]);

    // Get current data for animation
    const currentData = result?.smart_data[currentHour] || {
        hour: 0,
        solar_generation: 0,
        load_demand: 4,
        battery_soc: 50,
        grid_usage: 0,
        battery_charge: 0,
        battery_discharge: 0,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 container mx-auto px-4 py-8">
                {/* Header */}
                <header className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl blur-lg opacity-50" />
                                <div className="relative p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                                    <Cpu className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
                                    Microgrid Digital Twin
                                </h1>
                                <p className="text-sm text-slate-400 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                                    24-Hour Energy Scheduler & Optimizer • Delhi, India
                                </p>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="hidden md:flex items-center gap-3">
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50">
                                <div className={`w-2 h-2 rounded-full ${result ? "bg-emerald-400" : "bg-slate-500"} animate-pulse`} />
                                <span className="text-sm text-slate-300">
                                    {result ? `Hour ${String(currentHour).padStart(2, "0")}:00` : "Ready to Simulate"}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <Zap className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-red-400">Connection Error</p>
                            <p className="text-sm text-red-300/80">{error}</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Make sure the backend server is running at {API_URL}
                            </p>
                        </div>
                    </div>
                )}

                {/* Main Grid Layout - Three Rows */}
                <div className="space-y-6">
                    {/* Row 1: Controls, Animation, Gauges */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Controls */}
                        <div className="lg:col-span-3">
                            <ControlPanel
                                batteryCapacity={batteryCapacity}
                                setBatteryCapacity={setBatteryCapacity}
                                peakPrice={peakPrice}
                                setPeakPrice={setPeakPrice}
                                offPeakPrice={offPeakPrice}
                                setOffPeakPrice={setOffPeakPrice}
                                onSimulate={handleSimulate}
                                onReset={handleReset}
                                isLoading={isLoading}
                            />
                        </div>

                        {/* Animation */}
                        <div className="lg:col-span-5">
                            <MicrogridAnimation
                                simulationData={result?.smart_data || []}
                                isPlaying={isPlaying}
                                currentHour={currentHour}
                                onHourChange={setCurrentHour}
                                onPlayPause={() => setIsPlaying(!isPlaying)}
                            />
                        </div>

                        {/* Power Gauges */}
                        <div className="lg:col-span-4">
                            <PowerGauge
                                currentData={currentData}
                                historicalData={result?.smart_data.slice(0, currentHour + 1) || []}
                            />
                        </div>
                    </div>

                    {/* Row 2: Comparison Card + Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Comparison Card */}
                        <div className="lg:col-span-4">
                            <ComparisonCard summary={result?.summary || null} />
                        </div>

                        {/* Energy Chart */}
                        <div className="lg:col-span-8">
                            <EnergyChart
                                baselineData={result?.baseline_data || []}
                                smartData={result?.smart_data || []}
                            />
                        </div>
                    </div>

                    {/* Row 3: Info Cards */}
                    {result && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <InfoCard
                                icon={<div className="w-3 h-3 rounded-full bg-amber-400" />}
                                label="Peak Solar"
                                value={`${Math.max(...result.smart_data.map((d) => d.solar_generation)).toFixed(1)} kW`}
                            />
                            <InfoCard
                                icon={<div className="w-3 h-3 rounded-full bg-rose-400" />}
                                label="Peak Load"
                                value={`${Math.max(...result.smart_data.map((d) => d.load_demand)).toFixed(1)} kW`}
                            />
                            <InfoCard
                                icon={<div className="w-3 h-3 rounded-full bg-green-400" />}
                                label="Max SoC"
                                value={`${Math.max(...result.smart_data.map((d) => d.battery_soc)).toFixed(0)}%`}
                            />
                            <InfoCard
                                icon={<div className="w-3 h-3 rounded-full bg-purple-400" />}
                                label="Peak Grid"
                                value={`${Math.max(...result.smart_data.map((d) => d.grid_usage)).toFixed(1)} kW`}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="mt-12 pt-6 border-t border-slate-800">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
                        <p>
                            ⚡ Microgrid Digital Twin - Virtual Labs Hackathon 2026
                        </p>
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-2">
                                <span className="text-xs">Powered by</span>
                                <span className="font-semibold text-slate-400">FastAPI + Next.js + p5.js + Chart.js</span>
                            </span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

// Sub-component for info cards
function InfoCard({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-xl font-bold text-white">{value}</p>
        </div>
    );
}
