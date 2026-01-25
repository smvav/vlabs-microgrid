"use client";

/**
 * MicrogridAnimation Component
 * ============================
 * p5.js-powered 2D animation showing the microgrid system with:
 * - Solar Panel with animated sun rays
 * - Battery with dynamic charge level
 * - Power lines with flowing electrons
 * - House (load) with glowing lights
 * 
 * The animation responds to simulation data, showing energy flow direction
 * and intensity based on the current hour's solar, load, and battery state.
 */

import React, { useRef, useEffect, useState } from "react";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";

interface AnimationData {
    hour: number;
    solar_generation: number;
    load_demand: number;
    battery_soc: number;
    grid_usage: number;
    battery_charge: number;
    battery_discharge: number;
}

interface MicrogridAnimationProps {
    simulationData: AnimationData[];
    isPlaying: boolean;
    currentHour: number;
    onHourChange: (hour: number) => void;
    onPlayPause: () => void;
}

export default function MicrogridAnimation({
    simulationData,
    isPlaying,
    currentHour,
    onHourChange,
    onPlayPause,
}: MicrogridAnimationProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [p5Instance, setP5Instance] = useState<any>(null);

    // Get current data for animation
    const currentData = simulationData[currentHour] || {
        hour: 0,
        solar_generation: 0,
        load_demand: 4,
        battery_soc: 50,
        grid_usage: 0,
        battery_charge: 0,
        battery_discharge: 0,
    };

    useEffect(() => {
        if (typeof window === "undefined") return;

        const loadP5 = async () => {
            const p5Module = await import("p5");
            const p5 = p5Module.default;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sketch = (p: any) => {
                const electrons: { x: number; y: number; path: string; t: number; speed: number }[] = [];
                let sunRayAngle = 0;
                let glowIntensity = 0;
                let time = 0;

                p.setup = () => {
                    const canvas = p.createCanvas(600, 400);
                    canvas.parent(canvasRef.current!);
                    p.frameRate(30);

                    // Initialize electrons for each power line
                    for (let i = 0; i < 15; i++) {
                        electrons.push({
                            x: 0,
                            y: 0,
                            path: ["solar-battery", "battery-load", "grid-load"][Math.floor(Math.random() * 3)],
                            t: Math.random(),
                            speed: 0.01 + Math.random() * 0.01,
                        });
                    }
                };

                p.draw = () => {
                    // Dark gradient background
                    const bgGradient = p.drawingContext.createLinearGradient(0, 0, 0, p.height);
                    bgGradient.addColorStop(0, "#0f172a");
                    bgGradient.addColorStop(1, "#1e293b");
                    p.drawingContext.fillStyle = bgGradient;
                    p.rect(0, 0, p.width, p.height);

                    time += 0.02;
                    sunRayAngle += 0.02;
                    glowIntensity = 0.5 + 0.5 * Math.sin(time * 2);

                    // Get current simulation values (normalized)
                    const solarPower = currentData.solar_generation / 7; // Normalize to 0-1
                    const loadPower = currentData.load_demand / 8;
                    const batterySoC = currentData.battery_soc / 100;
                    const isCharging = currentData.battery_charge > 0;
                    const isDischarging = currentData.battery_discharge > 0;
                    const gridActive = currentData.grid_usage > 0;
                    const isDaytime = currentData.hour >= 6 && currentData.hour <= 18;

                    // Component positions
                    const sunPos = { x: 80, y: 80 };
                    const solarPos = { x: 120, y: 180 };
                    const batteryPos = { x: 300, y: 180 };
                    const housePos = { x: 480, y: 180 };
                    const gridPos = { x: 300, y: 350 };

                    // ========================================
                    // DRAW SUN (if daytime)
                    // ========================================
                    if (isDaytime && solarPower > 0.1) {
                        // Sun glow
                        p.noStroke();
                        for (let r = 60; r > 0; r -= 10) {
                            p.fill(255, 200, 50, (60 - r) * 0.5 * solarPower);
                            p.circle(sunPos.x, sunPos.y, r * 2);
                        }

                        // Sun core
                        p.fill(255, 220, 100);
                        p.circle(sunPos.x, sunPos.y, 40);

                        // Animated sun rays
                        p.stroke(255, 220, 100, 150 * solarPower);
                        p.strokeWeight(3);
                        for (let i = 0; i < 8; i++) {
                            const angle = sunRayAngle + (i * Math.PI) / 4;
                            const len = 25 + 10 * Math.sin(time * 3 + i);
                            p.line(
                                sunPos.x + Math.cos(angle) * 25,
                                sunPos.y + Math.sin(angle) * 25,
                                sunPos.x + Math.cos(angle) * (25 + len),
                                sunPos.y + Math.sin(angle) * (25 + len)
                            );
                        }
                    }

                    // ========================================
                    // DRAW SOLAR PANEL
                    // ========================================
                    p.push();
                    p.translate(solarPos.x, solarPos.y);

                    // Panel frame
                    p.stroke(100, 120, 140);
                    p.strokeWeight(3);
                    p.fill(30, 40, 60);
                    p.rect(-40, -30, 80, 60, 4);

                    // Solar cells
                    const cellColor = solarPower > 0.1
                        ? p.lerpColor(p.color(20, 30, 50), p.color(50, 100, 200), solarPower)
                        : p.color(20, 30, 50);
                    p.fill(cellColor);
                    p.noStroke();
                    for (let row = 0; row < 3; row++) {
                        for (let col = 0; col < 4; col++) {
                            p.rect(-35 + col * 18, -25 + row * 18, 15, 15, 2);
                        }
                    }

                    // Reflection animation when generating
                    if (solarPower > 0.1) {
                        p.fill(255, 255, 255, 50 * glowIntensity * solarPower);
                        p.rect(-35, -25 + (time * 20) % 60, 70, 5);
                    }

                    p.pop();

                    // Label
                    p.fill(200);
                    p.noStroke();
                    p.textAlign(p.CENTER);
                    p.textSize(11);
                    p.text("SOLAR", solarPos.x, solarPos.y + 50);
                    p.textSize(10);
                    p.fill(250, 200, 50);
                    p.text(`${currentData.solar_generation.toFixed(1)} kW`, solarPos.x, solarPos.y + 65);

                    // ========================================
                    // DRAW BATTERY
                    // ========================================
                    p.push();
                    p.translate(batteryPos.x, batteryPos.y);

                    // Battery body
                    p.stroke(100, 120, 140);
                    p.strokeWeight(3);
                    p.fill(30, 40, 60);
                    p.rect(-30, -40, 60, 80, 6);

                    // Battery terminal
                    p.fill(80, 90, 100);
                    p.rect(-10, -48, 20, 10, 2);

                    // Charge level (green gradient)
                    const chargeHeight = 70 * batterySoC;
                    const chargeGradient = p.drawingContext.createLinearGradient(0, 35, 0, 35 - chargeHeight);

                    if (batterySoC < 0.3) {
                        chargeGradient.addColorStop(0, "#ef4444");
                        chargeGradient.addColorStop(1, "#dc2626");
                    } else if (batterySoC < 0.6) {
                        chargeGradient.addColorStop(0, "#eab308");
                        chargeGradient.addColorStop(1, "#ca8a04");
                    } else {
                        chargeGradient.addColorStop(0, "#22c55e");
                        chargeGradient.addColorStop(1, "#16a34a");
                    }

                    p.drawingContext.fillStyle = chargeGradient;
                    p.noStroke();
                    p.rect(-25, 35 - chargeHeight, 50, chargeHeight, 3);

                    // Charging/discharging indicator
                    if (isCharging) {
                        p.fill(34, 197, 94, 150 + 100 * glowIntensity);
                        p.textSize(20);
                        p.textAlign(p.CENTER, p.CENTER);
                        p.text("⚡", 0, -5);
                    } else if (isDischarging) {
                        p.fill(234, 179, 8, 150 + 100 * glowIntensity);
                        p.textSize(16);
                        p.textAlign(p.CENTER, p.CENTER);
                        p.text("↓", 0, -5);
                    }

                    p.pop();

                    // Label
                    p.fill(200);
                    p.textAlign(p.CENTER);
                    p.textSize(11);
                    p.text("BATTERY", batteryPos.x, batteryPos.y + 60);
                    p.textSize(10);
                    p.fill(34, 197, 94);
                    p.text(`${currentData.battery_soc.toFixed(0)}%`, batteryPos.x, batteryPos.y + 75);

                    // ========================================
                    // DRAW HOUSE (LOAD)
                    // ========================================
                    p.push();
                    p.translate(housePos.x, housePos.y);

                    // House body
                    p.stroke(100, 120, 140);
                    p.strokeWeight(2);
                    p.fill(40, 50, 70);
                    p.rect(-35, -10, 70, 50, 4);

                    // Roof
                    p.fill(60, 70, 90);
                    p.triangle(-45, -10, 0, -50, 45, -10);

                    // Window with glow effect (based on load)
                    const windowGlow = loadPower * (0.7 + 0.3 * glowIntensity);
                    p.fill(255, 230, 150, 50 + windowGlow * 150);
                    p.rect(-20, 5, 15, 20, 2);
                    p.rect(5, 5, 15, 20, 2);

                    // Light beam from windows
                    if (loadPower > 0.3) {
                        p.noStroke();
                        p.fill(255, 230, 150, 20 * windowGlow);
                        p.beginShape();
                        p.vertex(-20, 25);
                        p.vertex(-30, 60);
                        p.vertex(-5, 60);
                        p.vertex(-5, 25);
                        p.endShape(p.CLOSE);

                        p.beginShape();
                        p.vertex(5, 25);
                        p.vertex(5, 60);
                        p.vertex(30, 60);
                        p.vertex(20, 25);
                        p.endShape(p.CLOSE);
                    }

                    // Door
                    p.fill(80, 60, 40);
                    p.rect(-5, 20, 10, 20, 2);

                    p.pop();

                    // Label
                    p.fill(200);
                    p.textAlign(p.CENTER);
                    p.textSize(11);
                    p.text("LOAD", housePos.x, housePos.y + 60);
                    p.textSize(10);
                    p.fill(244, 63, 94);
                    p.text(`${currentData.load_demand.toFixed(1)} kW`, housePos.x, housePos.y + 75);

                    // ========================================
                    // DRAW GRID
                    // ========================================
                    p.push();
                    p.translate(gridPos.x, gridPos.y);

                    // Transmission tower simplified
                    p.stroke(100, 120, 140);
                    p.strokeWeight(3);
                    p.line(-15, -30, -5, 0);
                    p.line(15, -30, 5, 0);
                    p.line(-15, -30, 15, -30);
                    p.line(-10, -15, 10, -15);

                    // Grid active indicator
                    if (gridActive) {
                        p.fill(168, 85, 247, 100 + 100 * glowIntensity);
                        p.noStroke();
                        p.circle(0, -30, 15);
                    }

                    p.pop();

                    // Label
                    p.fill(200);
                    p.textAlign(p.CENTER);
                    p.textSize(11);
                    p.text("GRID", gridPos.x, gridPos.y + 20);
                    if (gridActive) {
                        p.textSize(10);
                        p.fill(168, 85, 247);
                        p.text(`${currentData.grid_usage.toFixed(1)} kW`, gridPos.x, gridPos.y + 35);
                    }

                    // ========================================
                    // DRAW POWER LINES WITH ELECTRONS
                    // ========================================

                    // Define paths
                    const paths: { [key: string]: { start: { x: number; y: number }; end: { x: number; y: number }; active: boolean; color: number[] } } = {
                        "solar-battery": {
                            start: { x: solarPos.x + 45, y: solarPos.y },
                            end: { x: batteryPos.x - 35, y: batteryPos.y },
                            active: solarPower > 0.1 && isCharging,
                            color: [250, 200, 50],
                        },
                        "battery-load": {
                            start: { x: batteryPos.x + 35, y: batteryPos.y },
                            end: { x: housePos.x - 40, y: housePos.y },
                            active: isDischarging,
                            color: [34, 197, 94],
                        },
                        "solar-load": {
                            start: { x: solarPos.x + 45, y: solarPos.y - 20 },
                            end: { x: housePos.x - 40, y: housePos.y - 20 },
                            active: solarPower > 0.1 && !isCharging,
                            color: [250, 200, 50],
                        },
                        "grid-load": {
                            start: { x: gridPos.x, y: gridPos.y - 40 },
                            end: { x: housePos.x, y: housePos.y + 45 },
                            active: gridActive,
                            color: [168, 85, 247],
                        },
                    };

                    // Draw power lines
                    Object.entries(paths).forEach(([_key, path]) => {
                        p.stroke(path.active ? p.color(...path.color, 150) : p.color(60, 70, 80));
                        p.strokeWeight(path.active ? 3 : 2);
                        p.line(path.start.x, path.start.y, path.end.x, path.end.y);
                    });

                    // Update and draw electrons
                    electrons.forEach((electron) => {
                        const path = paths[electron.path];
                        if (path && path.active) {
                            electron.t += electron.speed;
                            if (electron.t > 1) electron.t = 0;

                            electron.x = p.lerp(path.start.x, path.end.x, electron.t);
                            electron.y = p.lerp(path.start.y, path.end.y, electron.t);

                            // Electron glow
                            p.noStroke();
                            p.fill(...path.color, 100);
                            p.circle(electron.x, electron.y, 10);
                            p.fill(...path.color, 255);
                            p.circle(electron.x, electron.y, 5);
                        }
                    });

                    // ========================================
                    // TIME DISPLAY
                    // ========================================
                    p.fill(200);
                    p.noStroke();
                    p.textAlign(p.LEFT);
                    p.textSize(14);
                    p.text(`Hour: ${String(currentData.hour).padStart(2, "0")}:00`, 20, 30);

                    // Day/Night indicator
                    p.textSize(12);
                    p.fill(isDaytime ? p.color(250, 200, 50) : p.color(100, 150, 255));
                    p.text(isDaytime ? "☀ Day" : "🌙 Night", 20, 50);
                };
            };

            const instance = new p5(sketch);
            setP5Instance(instance);

            return () => {
                instance.remove();
            };
        };

        loadP5();

        return () => {
            if (p5Instance) {
                p5Instance.remove();
            }
        };
    }, []);

    // Update p5 instance when data changes
    useEffect(() => {
        // p5 sketch reads from currentData ref, so it updates automatically
    }, [currentData]);

    return (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    Microgrid Animation
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onPlayPause}
                        className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg transition-colors"
                    >
                        {isPlaying ? (
                            <Pause className="w-5 h-5 text-emerald-400" />
                        ) : (
                            <Play className="w-5 h-5 text-emerald-400" />
                        )}
                    </button>
                    <button
                        onClick={() => onHourChange((currentHour + 1) % 24)}
                        className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
                    >
                        <SkipForward className="w-5 h-5 text-blue-400" />
                    </button>
                    <button
                        onClick={() => onHourChange(0)}
                        className="p-2 bg-slate-600/50 hover:bg-slate-600/70 rounded-lg transition-colors"
                    >
                        <RotateCcw className="w-5 h-5 text-slate-300" />
                    </button>
                </div>
            </div>

            {/* Canvas Container */}
            <div className="flex justify-center bg-slate-900/50 rounded-xl overflow-hidden">
                <canvas ref={canvasRef} />
            </div>

            {/* Hour Slider */}
            <div className="mt-4">
                <input
                    type="range"
                    min="0"
                    max="23"
                    value={currentHour}
                    onChange={(e) => onHourChange(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>23:00</span>
                </div>
            </div>
        </div>
    );
}
