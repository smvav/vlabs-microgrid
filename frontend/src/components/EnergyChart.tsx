"use client";

/**
 * EnergyChart Component
 * =====================
 * Multi-line Recharts visualization for the 24-hour energy simulation.
 * Displays Solar Generation, Load Demand, Battery SoC, and Grid Usage.
 * 
 * Key Visual Elements:
 * - Solar: Yellow/Amber gradient (represents sunshine)
 * - Load: Red/Pink gradient (represents demand)
 * - Battery SoC: Green gradient (represents storage state)
 * - Grid Usage: Purple/Blue for baseline vs smart comparison
 * 
 * The chart highlights "Peak Shaving" - showing reduced grid usage
 * during expensive peak hours when battery kicks in.
 */

import React from "react";
import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    ComposedChart,
    ReferenceLine,
} from "recharts";
import { BarChart3, Sun, Plug, Battery, Zap } from "lucide-react";

interface HourlyData {
    hour: number;
    solar_generation: number;
    load_demand: number;
    battery_soc: number;
    grid_usage: number;
    is_peak_hour: boolean;
}

interface EnergyChartProps {
    baselineData: HourlyData[];
    smartData: HourlyData[];
}

// Custom tooltip for rich data display
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const hour = parseInt(label);
        const isPeak = hour >= 14 && hour < 22; // Delhi peak hours: 2 PM - 10 PM

        return (
            <div className="bg-slate-800/95 backdrop-blur-xl rounded-xl border border-slate-600/50 p-4 shadow-2xl">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
                    <span className="text-lg font-bold text-white">
                        {hour.toString().padStart(2, "0")}:00
                    </span>
                    {isPeak && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full">
                            PEAK HOUR
                        </span>
                    )}
                </div>
                <div className="space-y-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-sm text-slate-300">{entry.name}</span>
                            </div>
                            <span className="text-sm font-bold text-white">
                                {entry.value.toFixed(2)} {entry.name.includes("SoC") ? "%" : "kW"}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export default function EnergyChart({ baselineData, smartData }: EnergyChartProps) {
    // Combine data for comparison chart
    const combinedData = smartData.map((smart, index) => {
        const baseline = baselineData[index];
        return {
            hour: smart.hour.toString().padStart(2, "0") + ":00",
            Solar: smart.solar_generation,
            Load: smart.load_demand,
            "Battery SoC": smart.battery_soc,
            "Grid (Smart)": smart.grid_usage,
            "Grid (Baseline)": baseline?.grid_usage || 0,
            isPeak: smart.is_peak_hour,
        };
    });

    const hasData = combinedData.length > 0;

    if (!hasData) {
        return (
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl h-[500px]">
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <BarChart3 className="w-16 h-16 text-slate-600" />
                    <p className="text-slate-400 text-center">
                        Run a simulation to visualize the 24-hour energy profile
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">24-Hour Energy Profile</h2>
                </div>

                {/* Legend Icons */}
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <Sun className="w-4 h-4 text-amber-400" />
                        <span className="text-slate-400">Solar</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Plug className="w-4 h-4 text-rose-400" />
                        <span className="text-slate-400">Load</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Battery className="w-4 h-4 text-green-400" />
                        <span className="text-slate-400">Battery</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-purple-400" />
                        <span className="text-slate-400">Grid</span>
                    </div>
                </div>
            </div>

            {/* Peak Hours Indicator */}
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                <span className="text-xs text-amber-300">
                    Peak pricing hours: 14:00 - 22:00 (2 PM - 10 PM Delhi)
                </span>
            </div>

            {/* Main Chart */}
            <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={combinedData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <defs>
                            {/* Gradients for area fills */}
                            <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="loadGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="peakZone" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.08} />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />

                        <XAxis
                            dataKey="hour"
                            axisLine={{ stroke: "#475569" }}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            tickLine={{ stroke: "#475569" }}
                        />

                        <YAxis
                            yAxisId="power"
                            axisLine={{ stroke: "#475569" }}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            tickLine={{ stroke: "#475569" }}
                            label={{
                                value: "Power (kW)",
                                angle: -90,
                                position: "insideLeft",
                                fill: "#94a3b8",
                                fontSize: 12,
                            }}
                        />

                        <YAxis
                            yAxisId="soc"
                            orientation="right"
                            domain={[0, 100]}
                            axisLine={{ stroke: "#475569" }}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            tickLine={{ stroke: "#475569" }}
                            label={{
                                value: "Battery SoC (%)",
                                angle: 90,
                                position: "insideRight",
                                fill: "#94a3b8",
                                fontSize: 12,
                            }}
                        />

                        <Tooltip content={<CustomTooltip />} />

                        <Legend
                            wrapperStyle={{ paddingTop: 20 }}
                            iconType="circle"
                            formatter={(value) => (
                                <span className="text-slate-300 text-sm">{value}</span>
                            )}
                        />

                        {/* Peak zone reference area (14:00 - 22:00 Delhi) */}
                        <ReferenceLine
                            yAxisId="power"
                            x="14:00"
                            stroke="#f59e0b"
                            strokeDasharray="4 4"
                            strokeOpacity={0.5}
                        />
                        <ReferenceLine
                            yAxisId="power"
                            x="22:00"
                            stroke="#f59e0b"
                            strokeDasharray="4 4"
                            strokeOpacity={0.5}
                        />

                        {/* Solar Generation - Area + Line */}
                        <Area
                            yAxisId="power"
                            type="monotone"
                            dataKey="Solar"
                            stroke="#f59e0b"
                            fill="url(#solarGradient)"
                            strokeWidth={0}
                        />
                        <Line
                            yAxisId="power"
                            type="monotone"
                            dataKey="Solar"
                            stroke="#f59e0b"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 6, fill: "#f59e0b", stroke: "#fff", strokeWidth: 2 }}
                        />

                        {/* Load Demand - Area + Line */}
                        <Area
                            yAxisId="power"
                            type="monotone"
                            dataKey="Load"
                            stroke="#f43f5e"
                            fill="url(#loadGradient)"
                            strokeWidth={0}
                        />
                        <Line
                            yAxisId="power"
                            type="monotone"
                            dataKey="Load"
                            stroke="#f43f5e"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 6, fill: "#f43f5e", stroke: "#fff", strokeWidth: 2 }}
                        />

                        {/* Battery SoC - Right Y-axis */}
                        <Line
                            yAxisId="soc"
                            type="stepAfter"
                            dataKey="Battery SoC"
                            stroke="#22c55e"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 6, fill: "#22c55e", stroke: "#fff", strokeWidth: 2 }}
                        />

                        {/* Grid Usage - Baseline (dashed) vs Smart (solid) */}
                        <Line
                            yAxisId="power"
                            type="monotone"
                            dataKey="Grid (Baseline)"
                            stroke="#a855f7"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: 5, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }}
                        />
                        <Line
                            yAxisId="power"
                            type="monotone"
                            dataKey="Grid (Smart)"
                            stroke="#8b5cf6"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 6, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Chart Legend */}
            <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-wrap gap-4 justify-center text-xs text-slate-400">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-purple-500" style={{ borderStyle: "dashed" }} />
                    <span>Grid (Baseline) - No battery</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-purple-500" />
                    <span>Grid (Smart) - With peak shaving</span>
                </div>
            </div>
        </div>
    );
}
