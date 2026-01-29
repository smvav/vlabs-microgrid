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

    // Generate sample data when API is unavailable
    const generateSampleData = useCallback(() => {
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
    }, [batteryCapacity, initialSoC, peakPrice, offPeakPrice]);

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
    }, [batteryCapacity, solarCapacity, weatherMode, peakPrice, standardPrice, offPeakPrice, initialSoC, currentStep, completedSteps, generateSampleData]);

    // Auto-run simulation when parameters change (debounced)
    useEffect(() => {
        if (!result) return; // Only auto-update if simulation has been run at least once

        const timeoutId = setTimeout(() => {
            runSimulation();
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batteryCapacity, solarCapacity, weatherMode, offPeakPrice, standardPrice, peakPrice, initialSoC, runSimulation]);

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
        <div className="min-h-screen bg-gray-50">
            {/* VLabs Header */}
            <header className="bg-blue-600 shadow-md">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                                <Zap className="w-8 h-8 text-[#1a5276]" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Microgrid Simulator & Energy Scheduler</h1>
                                <p className="text-sm text-blue-50">Virtual Labs - Energy Systems</p>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-sm text-white">
                            <span className="px-3 py-1 bg-blue-700 rounded">Delhi, India</span>
                            <span className="px-3 py-1 bg-green-600 rounded flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-300 rounded-full" />
                                Live Simulation
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tab Navigation */}
            <nav className="bg-white border-b border-gray-200">
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
                                    ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
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
                            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-blue-600" />
                                    Procedure Step {currentStep + 1}/{PROCEDURE_STEPS.length}
                                </h3>
                                <div className="bg-gray-50 rounded-lg p-3 mb-3">
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
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-gray-700 transition-colors"
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
                            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Battery className="w-4 h-4 text-green-600" />
                                    Microgrid Configuration
                                </h3>

                                <div className="space-y-4">
                                    {/* Solar Capacity */}
                                    <div>
                                        <label className="text-xs text-gray-600 flex justify-between">
                                            <span className="flex items-center gap-1">
                                                <Sun className="w-3 h-3 text-yellow-600" />
                                                Solar Capacity
                                            </span>
                                            <span className="text-yellow-600 font-medium">{solarCapacity} kW</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="3"
                                            max="7"
                                            step="1"
                                            value={solarCapacity}
                                            onChange={(e) => setSolarCapacity(Number(e.target.value))}
                                            className="w-full h-2 bg-yellow-200 rounded-lg appearance-none cursor-pointer mt-1"
                                        />
                                        <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                                            <span>3kW</span>
                                            <span>5kW</span>
                                            <span>7kW</span>
                                        </div>
                                    </div>

                                    {/* Weather Toggle */}
                                    <div>
                                        <label className="text-xs text-gray-600 mb-2 block">Weather Mode</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setWeatherMode("sunny")}
                                                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${weatherMode === "sunny"
                                                    ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                                                    }`}
                                            >
                                                <Sun className="w-4 h-4" />
                                                Sunny
                                            </button>
                                            <button
                                                onClick={() => setWeatherMode("cloudy")}
                                                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${weatherMode === "cloudy"
                                                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                                                    }`}
                                            >
                                                ☁️ Cloudy
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-1 text-center">
                                            {weatherMode === "sunny" ? "100% solar efficiency" : "50% solar efficiency"}
                                        </p>
                                    </div>

                                    {/* Battery Capacity */}
                                    <div>
                                        <label className="text-xs text-gray-600 flex justify-between">
                                            <span className="flex items-center gap-1">
                                                <Battery className="w-3 h-3 text-green-600" />
                                                Battery Capacity
                                            </span>
                                            <span className="text-green-600 font-medium">{batteryCapacity} kWh</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="5"
                                            max="20"
                                            value={batteryCapacity}
                                            onChange={(e) => setBatteryCapacity(Number(e.target.value))}
                                            className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer mt-1"
                                        />
                                    </div>

                                    {/* Initial SoC */}
                                    <div>
                                        <label className="text-xs text-gray-600 flex justify-between">
                                            <span>Initial State of Charge</span>
                                            <span className="text-green-600 font-medium">{initialSoC}%</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="20"
                                            max="100"
                                            value={initialSoC}
                                            onChange={(e) => setInitialSoC(Number(e.target.value))}
                                            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer mt-1"
                                        />
                                    </div>

                                    {/* 3-Tier Pricing Display */}
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <label className="text-xs text-gray-600 mb-2 block flex items-center gap-1">
                                            <Zap className="w-3 h-3 text-yellow-600" />
                                            Delhi ToD Tariff (₹/kWh)
                                        </label>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div className="text-center">
                                                <div className="text-blue-700 font-bold">₹{offPeakPrice}</div>
                                                <div className="text-gray-600 text-[10px]">Off-Peak</div>
                                                <div className="text-gray-500 text-[9px]">00-06h</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-gray-800 font-bold">₹{standardPrice}</div>
                                                <div className="text-gray-600 text-[10px]">Standard</div>
                                                <div className="text-gray-500 text-[9px]">06-18h</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-red-600 font-bold">₹{peakPrice}</div>
                                                <div className="text-gray-600 text-[10px]">Peak</div>
                                                <div className="text-gray-500 text-[9px]">18-22h</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Run Button */}
                                <button
                                    onClick={runSimulation}
                                    disabled={isLoading}
                                    className="w-full mt-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:bg-gray-300 rounded-lg font-semibold text-white transition-all shadow-sm"
                                >
                                    {isLoading ? "Running..." : "▶ Run Simulation"}
                                </button>
                            </div>

                            {/* Strategy Toggle */}
                            {result && (
                                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Active Strategy</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setActiveStrategy("baseline")}
                                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeStrategy === "baseline"
                                                ? "bg-red-100 text-red-700 border border-red-300"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                                                }`}
                                        >
                                            Baseline
                                        </button>
                                        <button
                                            onClick={() => setActiveStrategy("smart")}
                                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeStrategy === "smart"
                                                ? "bg-green-100 text-green-700 border border-green-300"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
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
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-yellow-600" />
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
                                <div className="p-4 border-t border-gray-200 relative z-10 bg-white">
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-mono text-gray-900 w-16">
                                            {String(currentHour).padStart(2, "0")}:00
                                        </span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="23"
                                            value={currentHour}
                                            onChange={(e) => setCurrentHour(Number(e.target.value))}
                                            className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <span className={`text-xs px-2 py-1 rounded border ${currentData.is_peak_hour
                                            ? "bg-red-50 text-red-700 border-red-200"
                                            : "bg-blue-50 text-blue-700 border-blue-200"
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
                            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Hour Statistics</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <StatCard
                                        icon={<Sun className="w-4 h-4" />}
                                        label="Solar"
                                        value={`${currentData.solar_generation.toFixed(1)} kW`}
                                        color="text-yellow-600"
                                        bgColor="bg-yellow-50"
                                    />
                                    <StatCard
                                        icon={<Home className="w-4 h-4" />}
                                        label="Load"
                                        value={`${currentData.load_demand.toFixed(1)} kW`}
                                        color="text-red-600"
                                        bgColor="bg-red-50"
                                    />
                                    <StatCard
                                        icon={<Battery className="w-4 h-4" />}
                                        label="Battery SoC"
                                        value={`${currentData.battery_soc.toFixed(0)}%`}
                                        color="text-green-600"
                                        bgColor="bg-green-50"
                                    />
                                    <StatCard
                                        icon={<Zap className="w-4 h-4" />}
                                        label="Grid"
                                        value={`${currentData.grid_usage.toFixed(1)} kW`}
                                        color="text-purple-600"
                                        bgColor="bg-purple-50"
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
                                <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-green-600" />
                                        Cost Comparison
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Baseline Cost:</span>
                                            <span className="text-red-600 font-mono">₹{result.summary.baseline_total_cost.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Smart Cost:</span>
                                            <span className="text-green-600 font-mono">₹{result.summary.smart_total_cost.toFixed(2)}</span>
                                        </div>
                                        <div className="pt-2 border-t border-green-200 flex justify-between">
                                            <span className="text-gray-900 font-medium">Savings:</span>
                                            <span className="text-green-700 font-bold">
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
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
                        <FlaskConical className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Simulation Data</h3>
                        <p className="text-gray-600 mb-4">Run a simulation first to see the analysis.</p>
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
            <footer className="bg-white border-t border-gray-200 mt-8 py-4">
                <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600">
                    <p>Microgrid Digital Twin • Virtual Labs Hackathon 2026</p>
                    <p className="text-xs mt-1 text-gray-500">Powered by Next.js + Three.js + D3.js + p5.js</p>
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
        <div className={`${bgColor} rounded-lg p-3 border border-gray-200`}>
            <div className={`flex items-center gap-2 ${color} mb-1`}>
                {icon}
                <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
    );
}

// Theory Content Component
function TheoryContent() {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-blue-600" />
                Theory: Microgrid Energy Management
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <section>
                        <h3 className="text-lg font-semibold text-yellow-700 mb-2">What is a Microgrid?</h3>
                        <p className="text-gray-700 text-sm leading-relaxed">
                            A microgrid is a localized energy system that can operate independently or connected to the main power grid.
                            It typically includes renewable energy sources (solar PV), energy storage (battery), and loads (homes/buildings).
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-green-700 mb-2">Energy Balance Equation</h3>
                        <div className="bg-gray-100 rounded-lg p-4 font-mono text-sm border border-gray-200">
                            <p className="text-gray-900">Solar + Battery_Discharge + Grid = Load + Battery_Charge</p>
                            <p className="text-gray-600 mt-2 text-xs">At every hour, energy in must equal energy out</p>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-purple-700 mb-2">Time-of-Use Pricing</h3>
                        <p className="text-gray-700 text-sm leading-relaxed">
                            Delhi BSES/TPDDL uses time-based pricing:
                        </p>
                        <ul className="text-sm text-gray-600 mt-2 space-y-1">
                            <li className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
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
                        <h3 className="text-lg font-semibold text-red-700 mb-2">Baseline Strategy</h3>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <ul className="text-sm text-gray-700 space-y-2">
                                <li>• Solar directly powers load when available</li>
                                <li>• Grid fills any deficit immediately</li>
                                <li>• Battery remains idle (not used)</li>
                                <li>• Excess solar is wasted</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-green-700 mb-2">Smart Strategy</h3>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <ul className="text-sm text-gray-700 space-y-2">
                                <li>• Store excess solar in battery</li>
                                <li>• Discharge battery during peak hours</li>
                                <li>• Minimize expensive grid purchases</li>
                                <li>• Maintain SoC between 20-100%</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-blue-700 mb-2">Key Benefits</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                                <p className="text-2xl font-bold text-green-700">20-30%</p>
                                <p className="text-xs text-gray-600">Cost Reduction</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                                <p className="text-2xl font-bold text-blue-700">15-25%</p>
                                <p className="text-xs text-gray-600">Grid Reduction</p>
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
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-600" />
                Procedure: Step-by-Step Guide
            </h2>

            <div className="space-y-4">
                {PROCEDURE_STEPS.map((step, index) => (
                    <button
                        key={step.id}
                        onClick={() => onStepChange(index)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${currentStep === index
                            ? "bg-blue-50 border-blue-300 shadow-sm"
                            : completedSteps.includes(index)
                                ? "bg-green-50 border-green-200"
                                : "bg-white border-gray-200 hover:bg-gray-50"
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${completedSteps.includes(index)
                                ? "bg-green-600"
                                : currentStep === index
                                    ? "bg-blue-600"
                                    : "bg-gray-400"
                                }`}>
                                {completedSteps.includes(index) ? (
                                    <span className="text-white">✓</span>
                                ) : (
                                    <span className="text-white font-bold">{step.id}</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className={`font-semibold ${currentStep === index ? "text-blue-700" : "text-gray-900"
                                    }`}>
                                    {step.title}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                            </div>
                            <step.icon className={`w-5 h-5 ${currentStep === index ? "text-blue-600" : "text-gray-500"
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
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-medium text-gray-900">Analysis Results</h2>
                    <span className="text-sm text-gray-400">Baseline vs Smart Strategy</span>
                </div>

                {/* Summary Cards */}
                <div className="grid md:grid-cols-3 gap-4">
                    {/* Cost Comparison */}
                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-500 mb-4">Daily Cost</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Baseline</span>
                                <span className="text-lg font-semibold text-gray-900">
                                    ₹{result.summary.baseline_total_cost.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Smart</span>
                                <span className="text-lg font-semibold text-green-600">
                                    ₹{result.summary.smart_total_cost.toFixed(2)}
                                </span>
                            </div>
                            <div className="pt-3 border-t border-gray-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Savings</span>
                                    <div className="text-right">
                                        <span className="text-xl font-bold text-green-600">
                                            {result.summary.cost_saved_percent.toFixed(1)}%
                                        </span>
                                        <p className="text-xs text-gray-500">
                                            ₹{result.summary.cost_saved.toFixed(2)}/day
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grid Usage */}
                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-500 mb-4">Grid Usage</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Baseline</span>
                                <span className="text-lg font-semibold text-gray-900">
                                    {result.summary.baseline_grid_usage.toFixed(1)} kWh
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Smart</span>
                                <span className="text-lg font-semibold text-green-600">
                                    {result.summary.smart_grid_usage.toFixed(1)} kWh
                                </span>
                            </div>
                            <div className="pt-3 border-t border-gray-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Reduction</span>
                                    <div className="text-right">
                                        <span className="text-xl font-bold text-gray-900">
                                            {result.summary.grid_reduced_percent.toFixed(1)}%
                                        </span>
                                        <p className="text-xs text-gray-500">
                                            {result.summary.grid_reduced.toFixed(1)} kWh saved
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Key Insights */}
                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-500 mb-4">Key Insights</h3>
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-gray-700">
                                    Reduces peak grid purchases effectively
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-gray-700">
                                    Stores excess solar for evening use
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-gray-700">
                                    {result.summary.cost_saved_percent.toFixed(0)}% cost reduction achieved
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-gray-700">
                                    Lower carbon footprint
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Hourly Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-4">24-Hour Breakdown</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-3 text-gray-600 font-medium">Hour</th>
                                <th className="text-right py-3 px-3 text-gray-600 font-medium">Solar</th>
                                <th className="text-right py-3 px-3 text-gray-600 font-medium">Load</th>
                                <th className="text-right py-3 px-3 text-gray-600 font-medium">Battery</th>
                                <th className="text-right py-3 px-3 text-gray-600 font-medium">Grid (Base)</th>
                                <th className="text-right py-3 px-3 text-gray-600 font-medium">Grid (Smart)</th>
                                <th className="text-right py-3 px-3 text-gray-600 font-medium">Savings</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.smart_data.map((smart, i) => {
                                const baseline = result.baseline_data[i];
                                const savings = baseline.hourly_cost - smart.hourly_cost;
                                return (
                                    <tr
                                        key={i}
                                        className={`border-b border-gray-100 hover:bg-gray-50 ${smart.is_peak_hour ? "bg-orange-50/50" : ""
                                            }`}
                                    >
                                        <td className="py-2.5 px-3 font-mono text-gray-900">
                                            {String(i).padStart(2, "0")}:00
                                            {smart.is_peak_hour && (
                                                <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Peak</span>
                                            )}
                                        </td>
                                        <td className="text-right py-2.5 px-3 text-amber-600 font-medium">
                                            {smart.solar_generation.toFixed(1)}
                                        </td>
                                        <td className="text-right py-2.5 px-3 text-gray-700 font-medium">
                                            {smart.load_demand.toFixed(1)}
                                        </td>
                                        <td className="text-right py-2.5 px-3">
                                            <span className={`font-medium ${smart.battery_soc > 70 ? "text-green-600" :
                                                smart.battery_soc > 30 ? "text-amber-600" : "text-red-600"
                                                }`}>
                                                {smart.battery_soc.toFixed(0)}%
                                            </span>
                                        </td>
                                        <td className="text-right py-2.5 px-3 text-gray-500">
                                            {baseline.grid_usage.toFixed(1)}
                                        </td>
                                        <td className="text-right py-2.5 px-3 text-indigo-600 font-medium">
                                            {smart.grid_usage.toFixed(1)}
                                        </td>
                                        <td className={`text-right py-2.5 px-3 font-medium ${savings > 0 ? "text-green-600" : "text-gray-400"
                                            }`}>
                                            {savings > 0 ? `₹${savings.toFixed(2)}` : "—"}
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
