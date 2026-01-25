"use client";

/**
 * ComparisonCard Component
 * ========================
 * Displays cost comparison between Baseline and Smart strategies.
 * Highlights the economic benefit of intelligent battery dispatch.
 */

import React from "react";
import { TrendingDown, TrendingUp, DollarSign, Zap, Battery, CircleDollarSign } from "lucide-react";

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

interface ComparisonCardProps {
    summary: Summary | null;
}

export default function ComparisonCard({ summary }: ComparisonCardProps) {
    if (!summary) {
        return (
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl">
                <div className="flex items-center justify-center h-48">
                    <p className="text-slate-400 text-center">
                        Run a simulation to see the cost comparison
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <CircleDollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Cost Analysis</h2>
            </div>

            {/* Main Savings Display */}
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-xl p-6 mb-6 border border-emerald-500/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="relative">
                    <p className="text-sm text-emerald-300 mb-1 uppercase tracking-wide font-medium">
                        Total Cost Saved
                    </p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                            ₹{summary.cost_saved.toFixed(2)}
                        </span>
                        <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded-full text-sm font-bold text-emerald-400">
                            <TrendingDown className="w-4 h-4" />
                            {summary.cost_saved_percent.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Cost Comparison */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Baseline Cost */}
                <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-red-500/20 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-red-400" />
                        </div>
                        <span className="text-xs text-slate-400 uppercase tracking-wide">Baseline</span>
                    </div>
                    <p className="text-2xl font-bold text-red-400">
                        ₹{summary.baseline_total_cost.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">No battery usage</p>
                </div>

                {/* Smart Cost */}
                <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                            <TrendingDown className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="text-xs text-slate-400 uppercase tracking-wide">Smart</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">
                        ₹{summary.smart_total_cost.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">With peak shaving</p>
                </div>
            </div>

            {/* Grid Usage Stats */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Grid Dependency Reduction
                </h3>

                {/* Progress Bar */}
                <div className="relative h-4 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-1000"
                        style={{ width: `${100 - summary.grid_reduced_percent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white drop-shadow-md">
                            {summary.grid_reduced_percent.toFixed(1)}% less grid
                        </span>
                    </div>
                </div>

                {/* Grid Stats */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">Baseline:</span>
                        <span className="font-semibold text-red-400">{summary.baseline_grid_usage.toFixed(1)} kWh</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">Smart:</span>
                        <span className="font-semibold text-emerald-400">{summary.smart_grid_usage.toFixed(1)} kWh</span>
                    </div>
                </div>

                {/* Battery Info */}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-700/50">
                    <Battery className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-slate-400">
                        Battery Capacity: <span className="font-bold text-green-400">{summary.battery_capacity_kwh} kWh</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
