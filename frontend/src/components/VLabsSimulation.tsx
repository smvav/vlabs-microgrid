"use client";

/**
 * VLabs Simulation Component
 * ==========================
 * Main container implementing VLabs-style interactive microgrid simulation.
 * 
 * Features:
 * - Step-by-step procedure walkthrough
 * - Three.js 3D microgrid visualization
 * - D3.js real-time energy flow charts
 * - p5.js animated components
 */

import React, { useState, useCallback, useEffect } from "react";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Sun, Battery, Home, Zap, Settings, BarChart3, BookOpen, FlaskConical } from "lucide-react";
import Microgrid3DScene from "./Microgrid3DScene";
import EnergyFlowD3 from "./EnergyFlowD3";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Simulation steps for the procedure
const PROCEDURE_STEPS = [
    {
        id: 1,
        title: "Initialize Microgrid",
        description: "Set the battery capacity (kWh) and initial state of charge. The battery stores excess solar energy for later use.",
        action: "configure",
        icon: Battery,
    },
    {
        id: 2,
        title: "Set Energy Prices",
        description: "Configure peak (₹8/kWh, 2PM-10PM) and off-peak (₹5/kWh) electricity prices. Smart strategy uses these to minimize costs.",
        action: "pricing",
        icon: Settings,
    },
    {
        id: 3,
        title: "Run Baseline Strategy",
        description: "Simulate 24 hours with baseline approach: Solar powers load directly, grid fills any deficit, battery remains idle.",
        action: "baseline",
        icon: Zap,
    },
    {
        id: 4,
        title: "Run Smart Strategy",
        description: "Simulate with intelligent scheduling: Charge battery when solar exceeds load, discharge during peak hours to reduce grid usage.",
        action: "smart",
        icon: FlaskConical,
    },
    {
        id: 5,
        title: "Analyze Results",
        description: "Compare costs and grid usage between strategies. Smart strategy achieves peak shaving and cost reduction.",
        action: "analyze",
        icon: BarChart3,
    },
];

interface HourlyData {
    hour: number;
    solar_generation: number;
    load_demand: number;
    battery_soc: number;
    grid_usage: number;
    battery_charge: number;
    battery_discharge: number;
    hourly_cost: number;
    is_peak_hour: boolean;
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

export default function VLabsSimulation() {
    // Tab state
    const [activeTab, setActiveTab] = useState<"theory" | "procedure" | "simulation" | "analysis">("simulation");

    // Procedure step state
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

    // Simulation parameters
    const [batteryCapacity, setBatteryCapacity] = useState(10);
    const [initialSoC, setInitialSoC] = useState(50);
    const [solarCapacity, setSolarCapacity] = useState(5);
    const [weatherMode, setWeatherMode] = useState<"sunny" | "cloudy">("sunny");
    // 3-tier Delhi pricing
    const [offPeakPrice, setOffPeakPrice] = useState(4);
    const [standardPrice, setStandardPrice] = useState(6.5);
    const [peakPrice, setPeakPrice] = useState(8.5);

    // Simulation state
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [activeStrategy, setActiveStrategy] = useState<"baseline" | "smart">("smart");

    // Animation state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentHour, setCurrentHour] = useState(0);
    const [animationSpeed] = useState(1000);

    // Animation loop
    useEffect(() => {
        if (!isPlaying || !result) return;

        const interval = setInterval(() => {
            setCurrentHour((prev) => (prev + 1) % 24);
        }, animationSpeed);

        return () => clearInterval(interval);
    }, [isPlaying, result, animationSpeed]);

    // Run simulation
    const runSimulation = useCallback(async () => {
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/simulate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    battery_capacity_kwh: batteryCapacity,
                    solar_capacity_kw: solarCapacity,
                    weather_mode: weatherMode,
                    off_peak_price: offPeakPrice,
                    standard_price: standardPrice,
                    peak_price: peakPrice,
                    initial_soc: initialSoC / 100,
                }),
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const data: SimulationResult = await response.json();
            setResult(data);
            setCurrentHour(0);
            setIsPlaying(true);

            // Mark steps as completed based on action
            if (!completedSteps.includes(currentStep)) {
                setCompletedSteps([...completedSteps, currentStep]);
            }
        } catch (err) {
            console.error("Simulation error:", err);
            // Generate sample data for demo
            generateSampleData();
        } finally {
            setIsLoading(false);
        }
    }, [batteryCapacity, peakPrice, offPeakPrice, initialSoC, currentStep, completedSteps]);

    // Generate sample data when API is unavailable
    const generateSampleData = () => {
        const generateHourlyData = (isBaseline: boolean): HourlyData[] => {
            const data: HourlyData[] = [];
            let soc = initialSoC;

            for (let hour = 0; hour < 24; hour++) {
                const solar = hour >= 6 && hour <= 18
                    ? 7 * Math.exp(-0.5 * Math.pow((hour - 12) / 3, 2))
                    : 0;
                const load = [1.5, 1.5, 1.5, 1.5, 2.0, 2.5, 3.5, 4.0, 4.5, 3.5, 3.0, 2.5, 2.5, 2.5, 3.0, 3.5, 4.0, 5.0, 6.5, 7.0, 6.5, 5.5, 4.0, 2.5][hour];
                const isPeak = hour >= 14 && hour < 22;
                const price = isPeak ? peakPrice : offPeakPrice;

                let gridUsage = 0;
                let batteryCharge = 0;
                let batteryDischarge = 0;

                if (isBaseline) {
                    gridUsage = Math.max(0, load - solar);
                } else {
                    const deficit = load - solar;
                    if (deficit < 0 && soc < 100) {
                        batteryCharge = Math.min(-deficit * 0.95, (100 - soc) / 100 * batteryCapacity);
                        soc += batteryCharge / batteryCapacity * 100;
                    } else if (deficit > 0 && isPeak && soc > 20) {
                        batteryDischarge = Math.min(deficit, (soc - 20) / 100 * batteryCapacity * 0.95);
                        soc -= batteryDischarge / batteryCapacity * 100;
                        gridUsage = Math.max(0, deficit - batteryDischarge);
                    } else {
                        gridUsage = Math.max(0, deficit);
                    }
                }

                data.push({
                    hour,
                    solar_generation: Math.round(solar * 100) / 100,
                    load_demand: Math.round(load * 100) / 100,
                    battery_soc: Math.round(soc * 10) / 10,
                    grid_usage: Math.round(gridUsage * 100) / 100,
                    battery_charge: Math.round(batteryCharge * 100) / 100,
                    battery_discharge: Math.round(batteryDischarge * 100) / 100,
                    hourly_cost: Math.round(gridUsage * price * 100) / 100,
                    is_peak_hour: isPeak,
                });
            }

            return data;
        };

        const baseline = generateHourlyData(true);
        const smart = generateHourlyData(false);

        const baselineCost = baseline.reduce((sum, d) => sum + d.hourly_cost, 0);
        const smartCost = smart.reduce((sum, d) => sum + d.hourly_cost, 0);
        const baselineGrid = baseline.reduce((sum, d) => sum + d.grid_usage, 0);
        const smartGrid = smart.reduce((sum, d) => sum + d.grid_usage, 0);

        setResult({
            baseline_data: baseline,
            smart_data: smart,
            summary: {
                baseline_total_cost: Math.round(baselineCost * 100) / 100,
                smart_total_cost: Math.round(smartCost * 100) / 100,
                cost_saved: Math.round((baselineCost - smartCost) * 100) / 100,
                cost_saved_percent: Math.round((baselineCost - smartCost) / baselineCost * 1000) / 10,
                baseline_grid_usage: Math.round(baselineGrid * 100) / 100,
                smart_grid_usage: Math.round(smartGrid * 100) / 100,
                grid_reduced: Math.round((baselineGrid - smartGrid) * 100) / 100,
                grid_reduced_percent: Math.round((baselineGrid - smartGrid) / baselineGrid * 1000) / 10,
                battery_capacity_kwh: batteryCapacity,
            },
        });

        setIsPlaying(true);
    };

    // Handle step navigation
    const nextStep = () => {
        if (currentStep < PROCEDURE_STEPS.length - 1) {
            if (!completedSteps.includes(currentStep)) {
                setCompletedSteps([...completedSteps, currentStep]);
            }
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Get current data for visualization
    const currentData = result
        ? (activeStrategy === "smart" ? result.smart_data : result.baseline_data)[currentHour]
        : {
            hour: currentHour,
            solar_generation: 0,
            load_demand: 4,
            battery_soc: initialSoC,
            grid_usage: 0,
            battery_charge: 0,
            battery_discharge: 0,
            hourly_cost: 0,
            is_peak_hour: false,
        };

    const activeData = result
        ? (activeStrategy === "smart" ? result.smart_data : result.baseline_data)
        : [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#1a1a2e] to-[#16213e]">
            {/* VLabs Header */}
            <header className="bg-gradient-to-r from-[#1a5276] to-[#2980b9] shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                                <Zap className="w-8 h-8 text-[#1a5276]" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Microgrid Simulator & Energy Scheduler</h1>
                                <p className="text-sm text-blue-100">Virtual Labs - Energy Systems</p>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-sm text-blue-100">
                            <span className="px-3 py-1 bg-white/20 rounded-full">Delhi, India</span>
                            <span className="px-3 py-1 bg-emerald-500/30 rounded-full flex items-center gap-1">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                Live Simulation
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tab Navigation */}
            <nav className="bg-[#1a1a2e] border-b border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-1">
                        {[
                            { id: "theory", label: "Theory", icon: BookOpen },
                            { id: "procedure", label: "Procedure", icon: Settings },
                            { id: "simulation", label: "Simulation", icon: FlaskConical },
                            { id: "analysis", label: "Analysis", icon: BarChart3 },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as "theory" | "procedure" | "simulation" | "analysis")}
                                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all ${activeTab === tab.id
                                    ? "bg-[#2980b9] text-white border-b-2 border-yellow-400"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                {activeTab === "theory" && (
                    <TheoryContent />
                )}

                {activeTab === "procedure" && (
                    <ProcedureContent
                        currentStep={currentStep}
                        completedSteps={completedSteps}
                        onStepChange={setCurrentStep}
                    />
                )}

                {activeTab === "simulation" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Panel - Controls & Steps */}
                        <div className="lg:col-span-3 space-y-4">
                            {/* Step Indicator */}
                            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-4">
                                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-blue-400" />
                                    Procedure Step {currentStep + 1}/{PROCEDURE_STEPS.length}
                                </h3>
                                <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        {React.createElement(PROCEDURE_STEPS[currentStep].icon, {
                                            className: "w-5 h-5 text-yellow-400"
                                        })}
                                        <span className="font-medium text-white text-sm">
                                            {PROCEDURE_STEPS[currentStep].title}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        {PROCEDURE_STEPS[currentStep].description}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={prevStep}
                                        disabled={currentStep === 0}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-white transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Prev
                                    </button>
                                    <button
                                        onClick={nextStep}
                                        disabled={currentStep === PROCEDURE_STEPS.length - 1}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-white transition-colors"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Configuration Panel */}
                            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-4">
                                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                                    <Battery className="w-4 h-4 text-green-400" />
                                    Microgrid Configuration
                                </h3>

                                <div className="space-y-4">
                                    {/* Solar Capacity */}
                                    <div>
                                        <label className="text-xs text-slate-400 flex justify-between">
                                            <span className="flex items-center gap-1">
                                                <Sun className="w-3 h-3 text-yellow-400" />
                                                Solar Capacity
                                            </span>
                                            <span className="text-yellow-400">{solarCapacity} kW</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="3"
                                            max="7"
                                            step="1"
                                            value={solarCapacity}
                                            onChange={(e) => setSolarCapacity(Number(e.target.value))}
                                            className="w-full h-2 bg-gradient-to-r from-yellow-900 to-yellow-600 rounded-lg appearance-none cursor-pointer mt-1"
                                        />
                                        <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                                            <span>3kW</span>
                                            <span>5kW</span>
                                            <span>7kW</span>
                                        </div>
                                    </div>

                                    {/* Weather Toggle */}
                                    <div>
                                        <label className="text-xs text-slate-400 mb-2 block">Weather Mode</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setWeatherMode("sunny")}
                                                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${weatherMode === "sunny"
                                                    ? "bg-gradient-to-r from-yellow-500/30 to-orange-500/30 text-yellow-400 border border-yellow-500/50 shadow-lg shadow-yellow-500/20"
                                                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                                                    }`}
                                            >
                                                <Sun className="w-4 h-4" />
                                                Sunny
                                            </button>
                                            <button
                                                onClick={() => setWeatherMode("cloudy")}
                                                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${weatherMode === "cloudy"
                                                    ? "bg-gradient-to-r from-slate-500/30 to-blue-500/30 text-blue-400 border border-blue-500/50 shadow-lg shadow-blue-500/20"
                                                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                                                    }`}
                                            >
                                                ☁️ Cloudy
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1 text-center">
                                            {weatherMode === "sunny" ? "100% solar efficiency" : "50% solar efficiency"}
                                        </p>
                                    </div>

                                    {/* Battery Capacity */}
                                    <div>
                                        <label className="text-xs text-slate-400 flex justify-between">
                                            <span className="flex items-center gap-1">
                                                <Battery className="w-3 h-3 text-green-400" />
                                                Battery Capacity
                                            </span>
                                            <span className="text-emerald-400">{batteryCapacity} kWh</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="5"
                                            max="20"
                                            value={batteryCapacity}
                                            onChange={(e) => setBatteryCapacity(Number(e.target.value))}
                                            className="w-full h-2 bg-gradient-to-r from-emerald-900 to-emerald-600 rounded-lg appearance-none cursor-pointer mt-1"
                                        />
                                    </div>

                                    {/* Initial SoC */}
                                    <div>
                                        <label className="text-xs text-slate-400 flex justify-between">
                                            <span>Initial State of Charge</span>
                                            <span className="text-emerald-400">{initialSoC}%</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="20"
                                            max="100"
                                            value={initialSoC}
                                            onChange={(e) => setInitialSoC(Number(e.target.value))}
                                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-1"
                                        />
                                    </div>

                                    {/* 3-Tier Pricing Display */}
                                    <div className="bg-slate-900/50 rounded-lg p-3">
                                        <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1">
                                            <Zap className="w-3 h-3" />
                                            Delhi ToD Tariff (₹/kWh)
                                        </label>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div className="text-center">
                                                <div className="text-blue-400 font-bold">₹{offPeakPrice}</div>
                                                <div className="text-slate-500 text-[10px]">Off-Peak</div>
                                                <div className="text-slate-600 text-[9px]">00-06h</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-slate-300 font-bold">₹{standardPrice}</div>
                                                <div className="text-slate-500 text-[10px]">Standard</div>
                                                <div className="text-slate-600 text-[9px]">06-18h</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-rose-400 font-bold">₹{peakPrice}</div>
                                                <div className="text-slate-500 text-[10px]">Peak</div>
                                                <div className="text-slate-600 text-[9px]">18-22h</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Run Button */}
                                <button
                                    onClick={runSimulation}
                                    disabled={isLoading}
                                    className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 rounded-lg font-semibold text-white transition-all shadow-lg shadow-emerald-500/25"
                                >
                                    {isLoading ? "Running..." : "▶ Run Simulation"}
                                </button>
                            </div>

                            {/* Strategy Toggle */}
                            {result && (
                                <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-4">
                                    <h3 className="text-sm font-semibold text-white mb-3">Active Strategy</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setActiveStrategy("baseline")}
                                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeStrategy === "baseline"
                                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/50"
                                                : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                                                }`}
                                        >
                                            Baseline
                                        </button>
                                        <button
                                            onClick={() => setActiveStrategy("smart")}
                                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeStrategy === "smart"
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                                                : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                                                }`}
                                        >
                                            Smart
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Center - 3D Visualization */}
                        <div className="lg:col-span-5">
                            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 overflow-hidden">
                                <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-yellow-400" />
                                        3D Microgrid Visualization
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsPlaying(!isPlaying)}
                                            className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                                        >
                                            {isPlaying ? (
                                                <Pause className="w-4 h-4 text-white" />
                                            ) : (
                                                <Play className="w-4 h-4 text-white" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => { setCurrentHour(0); setIsPlaying(false); }}
                                            className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                                        >
                                            <RotateCcw className="w-4 h-4 text-white" />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative overflow-hidden">
                                    <Microgrid3DScene
                                        currentData={currentData}
                                    />
                                </div>

                                {/* Time Slider - positioned above 3D scene */}
                                <div className="p-4 border-t border-slate-700/50 relative z-10 bg-slate-800/95">
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-mono text-white w-16">
                                            {String(currentHour).padStart(2, "0")}:00
                                        </span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="23"
                                            value={currentHour}
                                            onChange={(e) => setCurrentHour(Number(e.target.value))}
                                            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <span className={`text-xs px-2 py-1 rounded ${currentData.is_peak_hour
                                            ? "bg-rose-500/20 text-rose-400"
                                            : "bg-blue-500/20 text-blue-400"
                                            }`}>
                                            {currentData.is_peak_hour ? "Peak" : "Off-Peak"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right - D3 Charts & Stats */}
                        <div className="lg:col-span-4 space-y-4">
                            {/* Current Stats */}
                            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-4">
                                <h3 className="text-sm font-semibold text-white mb-3">Current Hour Statistics</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <StatCard
                                        icon={<Sun className="w-4 h-4" />}
                                        label="Solar"
                                        value={`${currentData.solar_generation.toFixed(1)} kW`}
                                        color="text-yellow-400"
                                        bgColor="bg-yellow-500/10"
                                    />
                                    <StatCard
                                        icon={<Home className="w-4 h-4" />}
                                        label="Load"
                                        value={`${currentData.load_demand.toFixed(1)} kW`}
                                        color="text-rose-400"
                                        bgColor="bg-rose-500/10"
                                    />
                                    <StatCard
                                        icon={<Battery className="w-4 h-4" />}
                                        label="Battery SoC"
                                        value={`${currentData.battery_soc.toFixed(0)}%`}
                                        color="text-emerald-400"
                                        bgColor="bg-emerald-500/10"
                                    />
                                    <StatCard
                                        icon={<Zap className="w-4 h-4" />}
                                        label="Grid"
                                        value={`${currentData.grid_usage.toFixed(1)} kW`}
                                        color="text-purple-400"
                                        bgColor="bg-purple-500/10"
                                    />
                                </div>
                            </div>

                            {/* D3 Energy Flow Chart */}
                            <EnergyFlowD3
                                data={activeData}
                                currentHour={currentHour}
                                strategy={activeStrategy}
                            />

                            {/* Results Summary */}
                            {result && (
                                <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 backdrop-blur rounded-xl border border-emerald-500/30 p-4">
                                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-emerald-400" />
                                        Cost Comparison
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Baseline Cost:</span>
                                            <span className="text-rose-400 font-mono">₹{result.summary.baseline_total_cost.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Smart Cost:</span>
                                            <span className="text-emerald-400 font-mono">₹{result.summary.smart_total_cost.toFixed(2)}</span>
                                        </div>
                                        <div className="pt-2 border-t border-slate-700/50 flex justify-between">
                                            <span className="text-white font-medium">Savings:</span>
                                            <span className="text-emerald-400 font-bold">
                                                ₹{result.summary.cost_saved.toFixed(2)} ({result.summary.cost_saved_percent.toFixed(1)}%)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "analysis" && result && (
                    <AnalysisContent result={result} />
                )}

                {activeTab === "analysis" && !result && (
                    <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-12 text-center">
                        <FlaskConical className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Simulation Data</h3>
                        <p className="text-slate-400 mb-4">Run a simulation first to see the analysis.</p>
                        <button
                            onClick={() => setActiveTab("simulation")}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
                        >
                            Go to Simulation
                        </button>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-[#1a1a2e] border-t border-slate-700/50 mt-8 py-4">
                <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
                    <p>Microgrid Digital Twin • Virtual Labs Hackathon 2026</p>
                    <p className="text-xs mt-1">Powered by Next.js + Three.js + D3.js + p5.js</p>
                </div>
            </footer>
        </div>
    );
}

// Stat Card Component
function StatCard({ icon, label, value, color, bgColor }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
    bgColor: string;
}) {
    return (
        <div className={`${bgColor} rounded-lg p-3`}>
            <div className={`flex items-center gap-2 ${color} mb-1`}>
                {icon}
                <span className="text-xs">{label}</span>
            </div>
            <p className="text-lg font-bold text-white">{value}</p>
        </div>
    );
}

// Theory Content Component
function TheoryContent() {
    return (
        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-blue-400" />
                Theory: Microgrid Energy Management
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <section>
                        <h3 className="text-lg font-semibold text-yellow-400 mb-2">What is a Microgrid?</h3>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            A microgrid is a localized energy system that can operate independently or connected to the main power grid.
                            It typically includes renewable energy sources (solar PV), energy storage (battery), and loads (homes/buildings).
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">Energy Balance Equation</h3>
                        <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-sm">
                            <p className="text-white">Solar + Battery_Discharge + Grid = Load + Battery_Charge</p>
                            <p className="text-slate-500 mt-2 text-xs">At every hour, energy in must equal energy out</p>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-purple-400 mb-2">Time-of-Use Pricing</h3>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            Delhi BSES/TPDDL uses time-based pricing:
                        </p>
                        <ul className="text-sm text-slate-400 mt-2 space-y-1">
                            <li className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-rose-500 rounded-full"></span>
                                Peak Hours (2PM-10PM): ₹8/kWh
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                                Off-Peak Hours: ₹5/kWh
                            </li>
                        </ul>
                    </section>
                </div>

                <div className="space-y-4">
                    <section>
                        <h3 className="text-lg font-semibold text-rose-400 mb-2">Baseline Strategy</h3>
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4">
                            <ul className="text-sm text-slate-300 space-y-2">
                                <li>• Solar directly powers load when available</li>
                                <li>• Grid fills any deficit immediately</li>
                                <li>• Battery remains idle (not used)</li>
                                <li>• Excess solar is wasted</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">Smart Strategy</h3>
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                            <ul className="text-sm text-slate-300 space-y-2">
                                <li>• Store excess solar in battery</li>
                                <li>• Discharge battery during peak hours</li>
                                <li>• Minimize expensive grid purchases</li>
                                <li>• Maintain SoC between 20-100%</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-blue-400 mb-2">Key Benefits</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-emerald-400">20-30%</p>
                                <p className="text-xs text-slate-400">Cost Reduction</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-blue-400">15-25%</p>
                                <p className="text-xs text-slate-400">Grid Reduction</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

// Procedure Content Component
function ProcedureContent({ currentStep, completedSteps, onStepChange }: {
    currentStep: number;
    completedSteps: number[];
    onStepChange: (step: number) => void;
}) {
    return (
        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-400" />
                Procedure: Step-by-Step Guide
            </h2>

            <div className="space-y-4">
                {PROCEDURE_STEPS.map((step, index) => (
                    <button
                        key={step.id}
                        onClick={() => onStepChange(index)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${currentStep === index
                            ? "bg-blue-500/20 border-blue-500/50"
                            : completedSteps.includes(index)
                                ? "bg-emerald-500/10 border-emerald-500/30"
                                : "bg-slate-900/30 border-slate-700/50 hover:bg-slate-800/50"
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${completedSteps.includes(index)
                                ? "bg-emerald-500"
                                : currentStep === index
                                    ? "bg-blue-500"
                                    : "bg-slate-700"
                                }`}>
                                {completedSteps.includes(index) ? (
                                    <span className="text-white">✓</span>
                                ) : (
                                    <span className="text-white font-bold">{step.id}</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className={`font-semibold ${currentStep === index ? "text-blue-400" : "text-white"
                                    }`}>
                                    {step.title}
                                </h4>
                                <p className="text-sm text-slate-400 mt-1">{step.description}</p>
                            </div>
                            <step.icon className={`w-5 h-5 ${currentStep === index ? "text-blue-400" : "text-slate-500"
                                }`} />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

// Analysis Content Component
function AnalysisContent({ result }: { result: SimulationResult }) {
    return (
        <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-emerald-400" />
                    Analysis: Simulation Results
                </h2>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Cost Comparison */}
                    <div className="bg-slate-900/50 rounded-xl p-4">
                        <h3 className="text-lg font-semibold text-white mb-4">Daily Cost</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Baseline</span>
                                <span className="text-xl font-bold text-rose-400">
                                    ₹{result.summary.baseline_total_cost.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Smart</span>
                                <span className="text-xl font-bold text-emerald-400">
                                    ₹{result.summary.smart_total_cost.toFixed(2)}
                                </span>
                            </div>
                            <div className="pt-3 border-t border-slate-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-white font-medium">Savings</span>
                                    <span className="text-2xl font-bold text-emerald-400">
                                        {result.summary.cost_saved_percent.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grid Usage */}
                    <div className="bg-slate-900/50 rounded-xl p-4">
                        <h3 className="text-lg font-semibold text-white mb-4">Grid Usage</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Baseline</span>
                                <span className="text-xl font-bold text-rose-400">
                                    {result.summary.baseline_grid_usage.toFixed(1)} kWh
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Smart</span>
                                <span className="text-xl font-bold text-emerald-400">
                                    {result.summary.smart_grid_usage.toFixed(1)} kWh
                                </span>
                            </div>
                            <div className="pt-3 border-t border-slate-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-white font-medium">Reduced</span>
                                    <span className="text-2xl font-bold text-blue-400">
                                        {result.summary.grid_reduced_percent.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Key Insights */}
                    <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 rounded-xl p-4 border border-emerald-500/30">
                        <h3 className="text-lg font-semibold text-white mb-4">Key Insights</h3>
                        <ul className="text-sm text-slate-300 space-y-2">
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-400">✓</span>
                                Smart strategy reduces peak grid purchases
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-400">✓</span>
                                Battery stores excess solar for evening use
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-400">✓</span>
                                Achieves {result.summary.cost_saved_percent.toFixed(0)}% cost reduction
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-400">✓</span>
                                Reduces carbon footprint by lowering grid dependence
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Hourly Breakdown */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">24-Hour Breakdown</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-slate-400 border-b border-slate-700">
                                <th className="text-left py-2 px-3">Hour</th>
                                <th className="text-right py-2 px-3">Solar</th>
                                <th className="text-right py-2 px-3">Load</th>
                                <th className="text-right py-2 px-3">Battery</th>
                                <th className="text-right py-2 px-3">Grid (Base)</th>
                                <th className="text-right py-2 px-3">Grid (Smart)</th>
                                <th className="text-right py-2 px-3">Savings</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.smart_data.map((smart, i) => {
                                const baseline = result.baseline_data[i];
                                const savings = baseline.hourly_cost - smart.hourly_cost;
                                return (
                                    <tr key={i} className={`border-b border-slate-800 ${smart.is_peak_hour ? "bg-rose-500/5" : ""}`}>
                                        <td className="py-2 px-3 font-mono">{String(i).padStart(2, "0")}:00</td>
                                        <td className="text-right py-2 px-3 text-yellow-400">{smart.solar_generation.toFixed(1)}</td>
                                        <td className="text-right py-2 px-3 text-rose-400">{smart.load_demand.toFixed(1)}</td>
                                        <td className="text-right py-2 px-3 text-emerald-400">{smart.battery_soc.toFixed(0)}%</td>
                                        <td className="text-right py-2 px-3 text-slate-400">{baseline.grid_usage.toFixed(1)}</td>
                                        <td className="text-right py-2 px-3 text-purple-400">{smart.grid_usage.toFixed(1)}</td>
                                        <td className={`text-right py-2 px-3 font-medium ${savings > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                                            {savings > 0 ? `₹${savings.toFixed(2)}` : "-"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
