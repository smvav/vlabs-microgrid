"use client";

/**
 * ControlPanel Component
 * ======================
 * Interactive controls for adjusting simulation parameters.
 * Allows users to modify Battery Capacity and Grid Pricing.
 */

import React from "react";
import { Sliders, Battery, Zap, IndianRupee, Play, RotateCcw } from "lucide-react";

interface ControlPanelProps {
    batteryCapacity: number;
    setBatteryCapacity: (value: number) => void;
    peakPrice: number;
    setPeakPrice: (value: number) => void;
    offPeakPrice: number;
    setOffPeakPrice: (value: number) => void;
    onSimulate: () => void;
    onReset: () => void;
    isLoading: boolean;
}

export default function ControlPanel({
    batteryCapacity,
    setBatteryCapacity,
    peakPrice,
    setPeakPrice,
    offPeakPrice,
    setOffPeakPrice,
    onSimulate,
    onReset,
    isLoading,
}: ControlPanelProps) {
    return (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Sliders className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Control Panel</h2>
            </div>

            <div className="space-y-6">
                {/* Battery Capacity Slider */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                            <Battery className="w-4 h-4 text-green-400" />
                            Battery Capacity
                        </label>
                        <span className="text-sm font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
                            {batteryCapacity} kWh
                        </span>
                    </div>
                    <input
                        type="range"
                        min="5"
                        max="50"
                        step="1"
                        value={batteryCapacity}
                        onChange={(e) => setBatteryCapacity(Number(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>5 kWh</span>
                        <span>50 kWh</span>
                    </div>
                </div>

                {/* Peak Price Input */}
                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                        <Zap className="w-4 h-4 text-amber-400" />
                        Peak Price (₹/kWh)
                    </label>
                    <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="number"
                            min="3"
                            max="15"
                            step="0.5"
                            value={peakPrice}
                            onChange={(e) => setPeakPrice(Number(e.target.value))}
                            className="w-full pl-8 pr-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                        />
                    </div>
                    <p className="text-xs text-slate-500">Peak hours: 2 PM - 10 PM (Delhi)</p>
                </div>

                {/* Off-Peak Price Input */}
                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                        <Zap className="w-4 h-4 text-blue-400" />
                        Off-Peak Price (₹/kWh)
                    </label>
                    <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="number"
                            min="2"
                            max="10"
                            step="0.5"
                            value={offPeakPrice}
                            onChange={(e) => setOffPeakPrice(Number(e.target.value))}
                            className="w-full pl-8 pr-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        />
                    </div>
                    <p className="text-xs text-slate-500">Night & early morning hours</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={onSimulate}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:shadow-none"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Simulating...
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5" />
                                Run Simulation
                            </>
                        )}
                    </button>
                    <button
                        onClick={onReset}
                        className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-xl transition-all duration-300"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
