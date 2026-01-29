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
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Sun, Battery, Home, Zap, Settings, BarChart3, BookOpen, FlaskConical, CheckSquare, FileText, CheckCircle2, XCircle, LayoutList, Lightbulb, HelpCircle } from "lucide-react";
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
    const [activeTab, setActiveTab] = useState<"theory" | "procedure" | "simulation" | "analysis" | "quiz" | "references">("simulation");

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

    // Tour state
    const [runTour, setRunTour] = useState(false);
    const [tourSteps] = useState<Step[]>([
        {
            target: '#tour-procedure-step',
            content: 'Start here! Follow these step-by-step instructions to guide your experiment.',
            placement: 'right',
            disableBeacon: true,
        },
        {
            target: '#tour-configuration',
            content: 'Set your simulation parameters here: Solar Capacity, Battery Size, and Weather.',
            placement: 'right',
        },
        {
            target: '#tour-run-button',
            content: 'Once configured, click "Run Simulation" to generate the data.',
            placement: 'right',
        },
        {
            target: '#tour-live-view',
            content: 'This 3D Digital Twin visualizes the microgrid operation in real-time.',
            placement: 'left',
        },
        {
            target: '#tour-stats-charts',
            content: 'Monitor the Energy Flow interactively here.',
            placement: 'left',
        },
        {
            target: '#tour-strategy-toggle',
            content: 'Switch between Baseline and Smart strategies to compare cost efficiency.',
            placement: 'top',
        },
    ]);

    // Start tour automatically on first visit to simulation tab
    useEffect(() => {
        if (activeTab === "simulation") {
            const hasSeenTour = localStorage.getItem('vlabs-tour-seen');
            if (!hasSeenTour) {
                setRunTour(true);
            }
        }
    }, [activeTab]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
        if (finishedStatuses.includes(status)) {
            setRunTour(false);
            localStorage.setItem('vlabs-tour-seen', 'true');
        }
    };

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
            <Joyride
                steps={tourSteps}
                run={runTour}
                continuous
                showProgress
                showSkipButton
                callback={handleJoyrideCallback}
                styles={{
                    options: {
                        primaryColor: '#2563eb', // blue-600
                        zIndex: 1000,
                    },
                    tooltipContainer: {
                        textAlign: "left"
                    }
                }}
            />
            {/* VLabs Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                                <Zap className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900">Microgrid Digital Twin</h1>
                                <p className="text-xs text-slate-500 font-medium">Virtual Labs Experiment </p>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-3 text-sm">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md border border-slate-200 text-xs font-medium">
                                Delhi, India
                            </span>
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 flex items-center gap-1.5 text-xs font-medium">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                System Online
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
                            { id: "quiz", label: "Quiz", icon: CheckSquare },
                            { id: "references", label: "References", icon: FileText },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as "theory" | "procedure" | "simulation" | "analysis" | "quiz" | "references")}
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
                            <div id="tour-procedure-step" className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-blue-600" />
                                    Procedure Step {currentStep + 1}/{PROCEDURE_STEPS.length}
                                </h3>
                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mb-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        {React.createElement(PROCEDURE_STEPS[currentStep].icon, {
                                            className: "w-4 h-4 text-blue-600"
                                        })}
                                        <span className="font-semibold text-slate-800 text-sm">
                                            {PROCEDURE_STEPS[currentStep].title}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed pl-6">
                                        {PROCEDURE_STEPS[currentStep].description}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={prevStep}
                                        disabled={currentStep === 0}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-xs font-medium text-slate-700 transition-colors"
                                    >
                                        <ChevronLeft className="w-3 h-3" />
                                        Prev
                                    </button>
                                    <button
                                        onClick={nextStep}
                                        disabled={currentStep === PROCEDURE_STEPS.length - 1}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-xs font-medium text-white transition-colors"
                                    >
                                        Next
                                        <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            {/* Configuration Panel */}
                            <div id="tour-configuration" className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Battery className="w-4 h-4 text-slate-400" />
                                    System Configuration
                                </h3>

                                <div className="space-y-4">
                                    {/* Solar Capacity */}
                                    <div>
                                        <label className="text-xs text-slate-600 flex justify-between font-medium">
                                            <span className="flex items-center gap-1">
                                                <Sun className="w-3 h-3 text-slate-500" />
                                                Solar Capacity
                                            </span>
                                            <span className="text-slate-900">{solarCapacity} kW</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="3"
                                            max="7"
                                            step="1"
                                            value={solarCapacity}
                                            onChange={(e) => setSolarCapacity(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-2 accent-blue-600"
                                        />
                                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                            <span>3kW</span>
                                            <span>5kW</span>
                                            <span>7kW</span>
                                        </div>
                                    </div>

                                    {/* Weather Toggle */}
                                    <div>
                                        <label className="text-xs text-slate-600 mb-2 block font-medium">Weather Mode</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setWeatherMode("sunny")}
                                                className={`py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 border ${weatherMode === "sunny"
                                                    ? "bg-slate-800 text-white border-slate-800"
                                                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                                                    }`}
                                            >
                                                <Sun className="w-3 h-3" />
                                                Sunny
                                            </button>
                                            <button
                                                onClick={() => setWeatherMode("cloudy")}
                                                className={`py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 border ${weatherMode === "cloudy"
                                                    ? "bg-slate-800 text-white border-slate-800"
                                                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                                                    }`}
                                            >
                                                <span className="text-xs">☁️</span> Cloudy
                                            </button>
                                        </div>
                                    </div>

                                    {/* Battery Capacity */}
                                    <div>
                                        <label className="text-xs text-slate-600 flex justify-between font-medium">
                                            <span className="flex items-center gap-1">
                                                <Battery className="w-3 h-3 text-slate-500" />
                                                Battery Capacity
                                            </span>
                                            <span className="text-slate-900">{batteryCapacity} kWh</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="5"
                                            max="20"
                                            value={batteryCapacity}
                                            onChange={(e) => setBatteryCapacity(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-2 accent-blue-600"
                                        />
                                    </div>

                                    {/* Initial SoC */}
                                    <div>
                                        <label className="text-xs text-slate-600 flex justify-between font-medium">
                                            <span>Initial State of Charge</span>
                                            <span className="text-slate-900">{initialSoC}%</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="20"
                                            max="100"
                                            value={initialSoC}
                                            onChange={(e) => setInitialSoC(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-2 accent-blue-600"
                                        />
                                    </div>

                                    {/* 3-Tier Pricing Display */}
                                    <div className="bg-slate-50 rounded border border-slate-200 p-3">
                                        <label className="text-xs text-slate-500 mb-2 block flex items-center gap-1 font-medium">
                                            <Zap className="w-3 h-3" />
                                            Delhi ToD Tariff (₹/kWh)
                                        </label>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div className="text-center">
                                                <div className="text-blue-600 font-bold">₹{offPeakPrice}</div>
                                                <div className="text-slate-500 font-medium text-[10px]">Off-Peak</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-slate-700 font-bold">₹{standardPrice}</div>
                                                <div className="text-slate-500 font-medium text-[10px]">Standard</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-red-600 font-bold">₹{peakPrice}</div>
                                                <div className="text-slate-500 font-medium text-[10px]">Peak</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Run Button */}
                                <button
                                    id="tour-run-button"
                                    onClick={runSimulation}
                                    disabled={isLoading}
                                    className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 rounded-lg font-medium text-sm text-white transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>Running...</>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4 fill-current" />
                                            Run Simulation
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Strategy Toggle */}
                            {result && (
                                <div id="tour-strategy-toggle" className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Active Strategy</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setActiveStrategy("baseline")}
                                            className={`py-2 px-3 rounded-md text-xs font-medium transition-all border ${activeStrategy === "baseline"
                                                ? "bg-slate-800 text-white border-slate-800"
                                                : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                                                }`}
                                        >
                                            Baseline
                                        </button>
                                        <button
                                            onClick={() => setActiveStrategy("smart")}
                                            className={`py-2 px-3 rounded-md text-xs font-medium transition-all border ${activeStrategy === "smart"
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                                                }`}
                                        >
                                            Smart (Optimized)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Center - 3D Visualization */}
                        <div className="lg:col-span-5">
                            <div id="tour-live-view" className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-blue-600" />
                                        Microgrid Live View
                                    </h3>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setIsPlaying(!isPlaying)}
                                            className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                                            title={isPlaying ? "Pause" : "Play"}
                                        >
                                            {isPlaying ? (
                                                <Pause className="w-4 h-4 fill-current" />
                                            ) : (
                                                <Play className="w-4 h-4 fill-current" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => { setCurrentHour(0); setIsPlaying(false); }}
                                            className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                                            title="Reset"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative overflow-hidden bg-black">
                                    <Microgrid3DScene
                                        currentData={currentData}
                                    />
                                </div>

                                {/* Time Slider */}
                                <div className="p-3 border-t border-slate-200 bg-white">
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-mono font-medium text-slate-700 w-12 text-center bg-slate-100 rounded py-0.5">
                                            {String(currentHour).padStart(2, "0")}:00
                                        </span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="23"
                                            value={currentHour}
                                            onChange={(e) => setCurrentHour(Number(e.target.value))}
                                            className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${currentData.is_peak_hour
                                            ? "bg-red-50 text-red-600 border-red-100"
                                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                            }`}>
                                            {currentData.is_peak_hour ? "Peak Price" : "Off-Peak"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right - D3 Charts & Stats */}
                        <div id="tour-stats-charts" className="lg:col-span-4 space-y-4">
                            {/* Current Stats */}
                            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                                <h3 className="text-sm font-semibold text-slate-900 mb-3">Current Statistics</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <StatCard
                                        icon={<Sun className="w-4 h-4" />}
                                        label="Solar"
                                        value={`${currentData.solar_generation.toFixed(1)} kW`}
                                        color="text-amber-500"
                                        bgColor=""
                                    />
                                    <StatCard
                                        icon={<Home className="w-4 h-4" />}
                                        label="Load"
                                        value={`${currentData.load_demand.toFixed(1)} kW`}
                                        color="text-slate-600"
                                        bgColor=""
                                    />
                                    <StatCard
                                        icon={<Battery className="w-4 h-4" />}
                                        label="Battery"
                                        value={`${currentData.battery_soc.toFixed(0)}%`}
                                        color={currentData.battery_soc > 20 ? "text-emerald-600" : "text-red-500"}
                                        bgColor=""
                                    />
                                    <StatCard
                                        icon={<Zap className="w-4 h-4" />}
                                        label="Grid"
                                        value={`${currentData.grid_usage.toFixed(1)} kW`}
                                        color="text-indigo-600"
                                        bgColor=""
                                    />
                                </div>
                            </div>

                            {/* D3 Energy Flow Chart */}
                            <div className="bg-white rounded-lg border border-slate-200 p-1 overflow-hidden shadow-sm">
                                <EnergyFlowD3
                                    data={activeData}
                                    currentHour={currentHour}
                                    strategy={activeStrategy}
                                />
                            </div>

                            {/* Results Summary */}
                            {result && (
                                <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-blue-600" />
                                        Cost Efficiency
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                                            <span className="text-slate-600 text-xs">Baseline Cost</span>
                                            <span className="text-slate-900 font-mono font-medium">₹{result.summary.baseline_total_cost.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-2 bg-blue-50/50 rounded border border-blue-100">
                                            <span className="text-blue-800 text-xs">Smart Cost</span>
                                            <span className="text-blue-700 font-mono font-bold">₹{result.summary.smart_total_cost.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-end pt-1">
                                            <span className="text-slate-500 text-xs">Net Savings</span>
                                            <div className="text-right">
                                                <span className="text-emerald-600 font-bold text-lg">
                                                    {result.summary.cost_saved_percent.toFixed(1)}%
                                                </span>
                                                <span className="text-slate-400 text-xs ml-1">saved</span>
                                            </div>
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

                {activeTab === "quiz" && (
                    <QuizContent />
                )}

                {activeTab === "references" && (
                    <ReferencesContent />
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
    bgColor: string; // Kept for interface compatibility but ignored in design
}) {
    return (
        <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
            <div className={`absolute top-0 right-0 p-2 opacity-10 ${color}`}>
                {icon}
            </div>
            <div className="relative z-10">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm ${color}`}>{icon}</span>
                    <p className="text-lg font-bold text-slate-900">{value}</p>
                </div>
            </div>
        </div>
    );
}

// Theory Content Component
function TheoryContent() {
    return (
        <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3 pb-4 border-b border-slate-100">
                <BookOpen className="w-6 h-6 text-blue-600" />
                Theory: Microgrid Energy Management System & Scheduling
            </h2>

            <div className="space-y-12">
                {/* 1. Introduction & Definition */}
                <section>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
                        1. What is a Microgrid?
                    </h3>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2">
                            <p className="text-slate-600 leading-relaxed text-sm mb-4">
                                A <strong>Microgrid</strong> is a localized group of electricity sources and loads that normally operates connected to the traditional wide-area synchronous grid (macrogrid), but has the ability to disconnect and function autonomously in "island mode".
                            </p>
                            <p className="text-slate-600 leading-relaxed text-sm">
                                Effective management of a microgrid requires an <strong>Energy Management System (EMS)</strong>—an intelligent control system that balances generation, storage, and load in real-time to minimize cost or maximize reliability.
                            </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
                            <h4 className="font-semibold text-slate-900 mb-3">Key Components</h4>
                            <ul className="space-y-2">
                                <li className="flex gap-2">
                                    <Sun className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <span className="text-slate-600"><strong>Solar PV:</strong> Intermittent renewable generation source.</span>
                                </li>
                                <li className="flex gap-2">
                                    <Battery className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span className="text-slate-600"><strong>BESS:</strong> Battery Energy Storage System for energy time-shifting.</span>
                                </li>
                                <li className="flex gap-2">
                                    <Zap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                    <span className="text-slate-600"><strong>The Grid:</strong> Infinite bus acting as backup and supplying power at variable rates.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* 2. Economic Motivation */}
                <section>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-emerald-600 rounded-full"></span>
                        2. Time-of-Use (ToU) Pricing & Arbitrage
                    </h3>
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div>
                            <p className="text-slate-600 leading-relaxed text-sm mb-4">
                                Utilities employ <strong>Time-of-Use (ToU)</strong> or Time-of-Day (ToD) tariffs to reflect the actual cost of generation. Electricity is significantly more expensive during "Peak Hours" (usually evenings) when demand is highest.
                            </p>
                            <div className="bg-white border-l-4 border-emerald-500 pl-4 py-2 my-4">
                                <h5 className="font-semibold text-slate-900 text-sm">Economic Concept: Energy Arbitrage</h5>
                                <p className="text-slate-600 text-xs mt-1">
                                    The strategy of purchasing/storing energy when prices are low (Off-peak/Solar) and using/selling it when prices are high (Peak).
                                    <br />
                                    <em>Formula: Profit = (Peak Price - OffPeak Price) × Energy Shifted</em>
                                </p>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                            <h4 className="font-semibold text-slate-900 text-sm mb-3 text-center">Delhi ToD Tariff Structure (Simulation Model)</h4>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-16 text-xs text-slate-500 text-right">00:00-06:00</div>
                                    <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 w-1/3"></div>
                                    </div>
                                    <div className="w-16 text-xs font-bold text-slate-700">₹4.0 <span className="text-[10px] font-normal text-slate-400">/kWh</span></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-16 text-xs text-slate-500 text-right">06:00-18:00</div>
                                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-slate-400 w-2/3"></div>
                                    </div>
                                    <div className="w-16 text-xs font-bold text-slate-700">₹6.5 <span className="text-[10px] font-normal text-slate-400">/kWh</span></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-16 text-xs text-slate-500 text-right">18:00-22:00</div>
                                    <div className="flex-1 h-2 bg-red-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500 w-full"></div>
                                    </div>
                                    <div className="w-16 text-xs font-bold text-red-600">₹8.5 <span className="text-[10px] font-normal text-slate-400">/kWh</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Control Strategies */}
                <section>
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span className="w-1 h-6 bg-purple-600 rounded-full"></span>
                        3. Intelligent Control Strategies
                    </h3>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-slate-100 rounded-lg">
                                    <RotateCcw className="w-5 h-5 text-slate-600" />
                                </div>
                                <h4 className="font-bold text-slate-900">Baseline Strategy (Uncontrolled)</h4>
                            </div>
                            <p className="text-slate-600 text-sm mb-4 min-h-[60px]">
                                Represents a "dumb" grid interaction with no energy management logic.
                            </p>
                            <ul className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
                                <li className="flex items-start gap-2">
                                    <span className="text-red-500 mt-1">✕</span>
                                    <span>Solar energy powers the load immediately.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-500 mt-1">✕</span>
                                    <span><strong>Wasted Surplus:</strong> Excess solar energy is curbed/wasted if load is low.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-500 mt-1">✕</span>
                                    <span><strong>Idle Battery:</strong> Battery sits at initial charge and is never used.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="border border-blue-200 bg-blue-50/10 rounded-xl p-5 hover:shadow-md transition-shadow relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <Zap className="w-24 h-24 text-blue-600" />
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <FlaskConical className="w-5 h-5 text-blue-600" />
                                </div>
                                <h4 className="font-bold text-blue-900">Smart Scheduling Strategy</h4>
                            </div>
                            <p className="text-slate-600 text-sm mb-4 min-h-[60px]">
                                Uses <strong>Heuristic Rule-Based Logic</strong> to minimize daily operational cost.
                            </p>
                            <ul className="space-y-2 text-sm text-slate-700 bg-white border border-blue-100 p-4 rounded-lg">
                                <li className="flex items-start gap-2">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                                    <span><strong>Priority 1 (Harvest):</strong> If Solar &gt; Load, charge battery with surplus (Store "Free" Energy).</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                                    <span><strong>Priority 2 (Peak Shave):</strong> If Peak Hour &amp; Battery available, discharge to meet load.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                                    <span><strong>Priority 3 (Grid):</strong> Only use grid for remaining deficit or off-peak needs.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* 4. Demand Side Management */}
                <section>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-amber-500 rounded-full"></span>
                        4. Key Objectives & Outcomes
                    </h3>
                    <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-bold text-slate-900 mb-2">Peak Shaving</h4>
                                <p className="text-slate-700 text-sm mb-4">
                                    Flattening the load curve by reducing grid consumption during peak hours. This reduces strain on the national grid and lowers demand charges.
                                </p>
                                <div className="h-16 flex items-end gap-1 opacity-70">
                                    {[20, 30, 80, 100, 90, 40, 30].map((h, i) => (
                                        <div key={i} className="flex-1 bg-red-400 rounded-t" style={{ height: `${h}%` }}></div>
                                    ))}
                                    <span className="text-xs text-slate-500 self-center ml-2">Baseline</span>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 mb-2">Load Shifting</h4>
                                <p className="text-slate-700 text-sm mb-4">
                                    Effectively moving the consumption of energy to a time when it is cheaper or greener (e.g., consuming solar energy generated at noon during the night via battery).
                                </p>
                                <div className="h-16 flex items-end gap-1 opacity-70">
                                    {[40, 50, 60, 60, 60, 50, 40].map((h, i) => (
                                        <div key={i} className="flex-1 bg-emerald-500 rounded-t" style={{ height: `${h}%` }}></div>
                                    ))}
                                    <span className="text-xs text-slate-500 self-center ml-2">Smart</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
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
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Simulation Walkthrough
            </h2>

            <div className="space-y-3">
                {PROCEDURE_STEPS.map((step, index) => {
                    const isActive = currentStep === index;
                    const isCompleted = completedSteps.includes(index);

                    return (
                        <button
                            key={step.id}
                            onClick={() => onStepChange(index)}
                            className={`w-full text-left p-4 rounded-lg border transition-all group ${isActive
                                ? "bg-slate-50 border-blue-500 shadow-sm"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${isActive
                                    ? "bg-blue-600 text-white"
                                    : isCompleted
                                        ? "bg-slate-800 text-white"
                                        : "bg-slate-100 text-slate-400"
                                    }`}>
                                    <span className="text-sm font-bold">{step.id}</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-sm font-semibold ${isActive ? "text-slate-900" : "text-slate-700"
                                        }`}>
                                        {step.title}
                                    </h4>
                                    <p className={`text-xs mt-1 ${isActive ? "text-slate-600" : "text-slate-500"}`}>
                                        {step.description}
                                    </p>
                                </div>
                                {isActive && <ChevronRight className="w-4 h-4 text-blue-500" />}
                            </div>
                        </button>
                    )
                })}
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

function QuizContent() {
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [submitted, setSubmitted] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const questions = [
        {
            id: 1,
            question: "In a Time-of-Use (ToU) tariff system, when is electricity most expensive?",
            options: [
                "During night time (10 PM - 6 AM)",
                "During peak demand hours (typically afternoon/evening)",
                "Early morning (6 AM - 9 AM)",
                "On weekends and holidays"
            ],
            correct: 1
        },
        {
            id: 2,
            question: "What is the primary benefit of Energy Arbitrage with a battery in a microgrid?",
            options: [
                "Increasing the voltage level constantly",
                "Buying energy at low prices and using/selling it when prices are high",
                "Cooling down the solar inverter",
                "Generating solar power during the night"
            ],
            correct: 1
        },
        {
            id: 3,
            question: "Which component is essential for a microgrid to operate in 'island mode'?",
            options: [
                "Smart Meter",
                "Grid connection",
                "Energy Storage or Local Generation source",
                "High-speed Internet connection"
            ],
            correct: 2
        },
        {
            id: 4,
            question: "What does SoC stand for in the context of battery management?",
            options: [
                "Source of Current",
                "State of Charge",
                "System of Control",
                "Solar on Cloud"
            ],
            correct: 1
        },
        {
            id: 5,
            question: "A 'smart' energy management system primarily aims to:",
            options: [
                "Maximize grid usage at all times",
                "Keep the battery 100% charged constantly",
                "Optimize cost and efficiency by balancing generation, load, and prices",
                "Disconnect user loads randomly to save power"
            ],
            correct: 2
        }
    ];

    const handleSubmit = () => {
        setSubmitted(true);
        setShowResults(true);
    };

    const resetQuiz = () => {
        setAnswers({});
        setSubmitted(false);
        setShowResults(false);
    };

    const score = Object.keys(answers).reduce((acc, key) => {
        const qId = parseInt(key);
        const q = questions.find(q => q.id === qId);
        if (q && answers[qId] === q.correct) {
            return acc + 1;
        }
        return acc;
    }, 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-indigo-50 rounded-lg">
                        <CheckSquare className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Knowledge Check</h2>
                        <p className="text-slate-600">Test your understanding of Microgrid concepts.</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {questions.map((q, idx) => (
                        <div key={q.id} className="p-6 bg-slate-50 rounded-lg border border-slate-100">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                {idx + 1}. {q.question}
                            </h3>
                            <div className="space-y-3">
                                {q.options.map((option, optIdx) => (
                                    <button
                                        key={optIdx}
                                        disabled={submitted}
                                        onClick={() => setAnswers({ ...answers, [q.id]: optIdx })}
                                        className={`w-full text-left p-4 rounded-md border transition-all flex items-center justify-between ${answers[q.id] === optIdx
                                            ? "bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm"
                                            : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700"
                                            } ${showResults && q.correct === optIdx
                                                ? "!bg-green-50 !border-green-300 !text-green-800"
                                                : showResults && answers[q.id] === optIdx && answers[q.id] !== q.correct
                                                    ? "!bg-red-50 !border-red-200 !text-red-800"
                                                    : ""
                                            }`}
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs border ${answers[q.id] === optIdx ? "border-indigo-500 bg-indigo-100 text-indigo-700" : "border-slate-300 text-slate-500"
                                                } ${showResults && q.correct === optIdx ? "!bg-green-100 !border-green-500 !text-green-700" : ""}`}>
                                                {String.fromCharCode(65 + optIdx)}
                                            </span>
                                            {option}
                                        </span>
                                        {showResults && (
                                            q.correct === optIdx ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                                                (answers[q.id] === optIdx ? <XCircle className="w-5 h-5 text-red-500" /> : null)
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
                    <div>
                        {showResults && (
                            <p className="text-lg font-medium">
                                Score: <span className={score >= 4 ? "text-green-600" : "text-indigo-600"}>{score} / {questions.length}</span>
                                <span className="text-sm text-slate-500 ml-2">
                                    {score === questions.length ? "Excellent!" : score >= 3 ? "Good job!" : "Keep learning!"}
                                </span>
                            </p>
                        )}
                    </div>
                    {!showResults ? (
                        <button
                            onClick={handleSubmit}
                            disabled={Object.keys(answers).length < questions.length}
                            className={`px-6 py-2.5 rounded-lg font-medium text-white transition-colors ${Object.keys(answers).length < questions.length
                                ? "bg-slate-300 cursor-not-allowed"
                                : "bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                                }`}
                        >
                            Submit Answers
                        </button>
                    ) : (
                        <button
                            onClick={resetQuiz}
                            className="px-6 py-2.5 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                        >
                            Retake Quiz
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ReferencesContent() {
    const references = [
        {
            category: "Standards",
            items: [
                {
                    title: "IEEE 2030.7-2017",
                    desc: "IEEE Standard for the Specification of Microgrid Controllers",
                    link: "https://standards.ieee.org/standard/2030_7-2017.html"
                },
                {
                    title: "IEC 61850-7-420:2009",
                    desc: "Communication networks and systems for power utility automation - Distributed energy resources logical nodes",
                    link: "https://webstore.iec.ch/publication/6018"
                }
            ]
        },
        {
            category: "Academic Papers",
            items: [
                {
                    title: "A review of smart energy management systems in microgrids",
                    desc: "C. Chen et al., Renewable and Sustainable Energy Reviews, vol. 60, pp. 1163–1178, 2017.",
                    link: "#"
                },
                {
                    title: "Energy management systems for microgrids: A review",
                    desc: "W. Shi et al., Wiley Interdisciplinary Reviews: Energy and Environment, 2015.",
                    link: "#"
                },
                {
                    title: "Microgrids: Architectures and Control",
                    desc: "N. Hatziargyriou et al., IEEE Power and Energy Magazine, 2007.",
                    link: "#"
                }
            ]
        },
        {
            category: "Books",
            items: [
                {
                    title: "Microgrids: Architectures and Control",
                    desc: "N. Hatziargyriou, Wiley-IEEE Press, 2014. ISBN: 978-1-118-72068-4",
                    link: "#"
                }
            ]
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-amber-50 rounded-lg">
                        <FileText className="w-8 h-8 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">References & Further Reading</h2>
                        <p className="text-slate-600">Essential resources for Microgrid standards and research.</p>
                    </div>
                </div>

                <div className="grid gap-6">
                    {references.map((section, idx) => (
                        <div key={idx} className="border border-slate-100 rounded-lg overflow-hidden">
                            <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                                <LayoutList className="w-4 h-4 text-slate-500" />
                                <h3 className="font-semibold text-slate-800">{section.category}</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                {section.items.map((item, i) => (
                                    <div key={i} className="group flex items-start justify-between">
                                        <div>
                                            <h4 className="text-base font-medium text-blue-700 group-hover:underline cursor-pointer">
                                                {item.title}
                                            </h4>
                                            <p className="text-sm text-slate-600 mt-1">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 p-4 bg-sky-50 rounded-lg border border-sky-100 text-sky-800 text-sm flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 flex-shrink-0 text-sky-600 mt-0.5" />
                    <p>
                        These references are widely cited in the electrical engineering community.
                        IEEE 2030.7 is particularly important for understanding the functional specifications of a generic Microgrid Controller.
                    </p>
                </div>
            </div>
        </div>
    );
}
