"use client";

/**
 * PowerGauge Component
 * ====================
 * Chart.js-powered real-time doughnut gauge showing current power metrics.
 * Displays Solar Generation, Load Demand, Battery Status, and Grid Usage
 * as animated gauges that respond to simulation data.
 */

import React from "react";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { Sun, Plug, Battery, Zap } from "lucide-react";

// Register Chart.js components
ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler
);

interface PowerData {
    hour: number;
    solar_generation: number;
    load_demand: number;
    battery_soc: number;
    grid_usage: number;
}

interface PowerGaugeProps {
    currentData: PowerData;
    historicalData: PowerData[];
}

export default function PowerGauge({ currentData, historicalData }: PowerGaugeProps) {
    // Solar Gauge Configuration
    const solarGaugeData = {
        datasets: [
            {
                data: [currentData.solar_generation, Math.max(0, 8 - currentData.solar_generation)],
                backgroundColor: ["#f59e0b", "#1e293b"],
                borderWidth: 0,
                cutout: "75%",
                circumference: 270,
                rotation: 225,
            },
        ],
    };

    // Battery Gauge Configuration
    const batteryGaugeData = {
        datasets: [
            {
                data: [currentData.battery_soc, 100 - currentData.battery_soc],
                backgroundColor: [
                    currentData.battery_soc > 60 ? "#22c55e" : currentData.battery_soc > 30 ? "#eab308" : "#ef4444",
                    "#1e293b",
                ],
                borderWidth: 0,
                cutout: "75%",
                circumference: 270,
                rotation: 225,
            },
        ],
    };

    // Load Gauge Configuration
    const loadGaugeData = {
        datasets: [
            {
                data: [currentData.load_demand, Math.max(0, 8 - currentData.load_demand)],
                backgroundColor: ["#f43f5e", "#1e293b"],
                borderWidth: 0,
                cutout: "75%",
                circumference: 270,
                rotation: 225,
            },
        ],
    };

    // Grid Gauge Configuration
    const gridGaugeData = {
        datasets: [
            {
                data: [currentData.grid_usage, Math.max(0, 8 - currentData.grid_usage)],
                backgroundColor: ["#a855f7", "#1e293b"],
                borderWidth: 0,
                cutout: "75%",
                circumference: 270,
                rotation: 225,
            },
        ],
    };

    const gaugeOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
        },
    };

    // Historical Power Line Chart
    const lineChartData = {
        labels: historicalData.slice(-12).map((d) => `${String(d.hour).padStart(2, "0")}:00`),
        datasets: [
            {
                label: "Solar",
                data: historicalData.slice(-12).map((d) => d.solar_generation),
                borderColor: "#f59e0b",
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                fill: true,
                tension: 0.4,
                pointRadius: 0,
            },
            {
                label: "Load",
                data: historicalData.slice(-12).map((d) => d.load_demand),
                borderColor: "#f43f5e",
                backgroundColor: "rgba(244, 63, 94, 0.1)",
                fill: true,
                tension: 0.4,
                pointRadius: 0,
            },
            {
                label: "Grid",
                data: historicalData.slice(-12).map((d) => d.grid_usage),
                borderColor: "#a855f7",
                backgroundColor: "rgba(168, 85, 247, 0.1)",
                fill: true,
                tension: 0.4,
                pointRadius: 0,
            },
        ],
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: "top" as const,
                labels: {
                    color: "#94a3b8",
                    usePointStyle: true,
                    pointStyle: "circle",
                    padding: 15,
                    font: { size: 11 },
                },
            },
            tooltip: {
                backgroundColor: "#1e293b",
                titleColor: "#fff",
                bodyColor: "#94a3b8",
                borderColor: "#475569",
                borderWidth: 1,
                padding: 10,
            },
        },
        scales: {
            x: {
                grid: { color: "rgba(71, 85, 105, 0.3)" },
                ticks: { color: "#64748b", font: { size: 10 } },
            },
            y: {
                grid: { color: "rgba(71, 85, 105, 0.3)" },
                ticks: { color: "#64748b", font: { size: 10 } },
                min: 0,
                max: 8,
            },
        },
    };

    return (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl">
            {/* Header */}
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="text-2xl">📊</span>
                Real-Time Power Meters
            </h2>

            {/* Gauges Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* Solar Gauge */}
                <div className="relative flex flex-col items-center">
                    <div className="w-24 h-24 relative">
                        <Doughnut data={solarGaugeData} options={gaugeOptions} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Sun className="w-5 h-5 text-amber-400 mb-1" />
                            <span className="text-lg font-bold text-amber-400">
                                {currentData.solar_generation.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-slate-400">kW</span>
                        </div>
                    </div>
                    <span className="text-xs text-slate-400 mt-2">Solar</span>
                </div>

                {/* Battery Gauge */}
                <div className="relative flex flex-col items-center">
                    <div className="w-24 h-24 relative">
                        <Doughnut data={batteryGaugeData} options={gaugeOptions} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Battery className="w-5 h-5 text-green-400 mb-1" />
                            <span className="text-lg font-bold text-green-400">
                                {currentData.battery_soc.toFixed(0)}
                            </span>
                            <span className="text-[10px] text-slate-400">%</span>
                        </div>
                    </div>
                    <span className="text-xs text-slate-400 mt-2">Battery</span>
                </div>

                {/* Load Gauge */}
                <div className="relative flex flex-col items-center">
                    <div className="w-24 h-24 relative">
                        <Doughnut data={loadGaugeData} options={gaugeOptions} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Plug className="w-5 h-5 text-rose-400 mb-1" />
                            <span className="text-lg font-bold text-rose-400">
                                {currentData.load_demand.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-slate-400">kW</span>
                        </div>
                    </div>
                    <span className="text-xs text-slate-400 mt-2">Load</span>
                </div>

                {/* Grid Gauge */}
                <div className="relative flex flex-col items-center">
                    <div className="w-24 h-24 relative">
                        <Doughnut data={gridGaugeData} options={gaugeOptions} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Zap className="w-5 h-5 text-purple-400 mb-1" />
                            <span className="text-lg font-bold text-purple-400">
                                {currentData.grid_usage.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-slate-400">kW</span>
                        </div>
                    </div>
                    <span className="text-xs text-slate-400 mt-2">Grid</span>
                </div>
            </div>

            {/* Historical Line Chart */}
            {historicalData.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-700/50">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">Power History (Last 12 Hours)</h3>
                    <div className="h-48">
                        <Line data={lineChartData} options={lineChartOptions} />
                    </div>
                </div>
            )}
        </div>
    );
}
