"use client";

/**
 * Energy Flow D3 Component
 * ========================
 * D3.js-powered real-time energy visualization.
 * 
 * Features:
 * - Stacked area chart showing energy sources over time
 * - Current hour indicator
 * - Interactive tooltips
 */

import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

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

interface EnergyFlowD3Props {
    data: HourlyData[];
    currentHour: number;
    strategy: "baseline" | "smart";
}

export default function EnergyFlowD3({ data, currentHour, strategy }: EnergyFlowD3Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current || data.length === 0) return;

        const container = containerRef.current;
        const svg = d3.select(svgRef.current);

        // Clear previous content
        svg.selectAll("*").remove();

        // Dimensions
        const margin = { top: 20, right: 20, bottom: 30, left: 40 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = 200 - margin.top - margin.bottom;

        // Create main group
        const g = svg
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const x = d3.scaleLinear()
            .domain([0, 23])
            .range([0, width]);

        const maxValue = d3.max(data, d => Math.max(d.solar_generation, d.load_demand, d.grid_usage + d.battery_discharge)) || 8;
        const y = d3.scaleLinear()
            .domain([0, maxValue * 1.1])
            .range([height, 0]);

        // Grid lines
        g.append("g")
            .attr("class", "grid")
            .attr("opacity", 0.1)
            .call(d3.axisLeft(y)
                .tickSize(-width)
                .tickFormat(() => "")
            )
            .call(g => g.select(".domain").remove());

        // X Axis
        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .tickValues([0, 6, 12, 18, 23])
                .tickFormat(d => `${d}:00`)
            )
            .attr("color", "#64748b")
            .call(g => g.select(".domain").attr("stroke", "#334155"))
            .call(g => g.selectAll(".tick line").attr("stroke", "#334155"))
            .call(g => g.selectAll(".tick text").attr("fill", "#64748b").attr("font-size", "10px"));

        // Y Axis
        g.append("g")
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d} kW`))
            .attr("color", "#64748b")
            .call(g => g.select(".domain").attr("stroke", "#334155"))
            .call(g => g.selectAll(".tick line").attr("stroke", "#334155"))
            .call(g => g.selectAll(".tick text").attr("fill", "#64748b").attr("font-size", "10px"));

        // Peak hours background
        const peakStart = 14;
        const peakEnd = 22;
        g.append("rect")
            .attr("x", x(peakStart))
            .attr("y", 0)
            .attr("width", x(peakEnd) - x(peakStart))
            .attr("height", height)
            .attr("fill", "#ef4444")
            .attr("opacity", 0.05);

        // Peak label
        g.append("text")
            .attr("x", x((peakStart + peakEnd) / 2))
            .attr("y", 10)
            .attr("text-anchor", "middle")
            .attr("fill", "#ef4444")
            .attr("font-size", "9px")
            .attr("opacity", 0.6)
            .text("Peak Hours");

        // Line generators
        const solarLine = d3.line<HourlyData>()
            .x(d => x(d.hour))
            .y(d => y(d.solar_generation))
            .curve(d3.curveMonotoneX);

        const loadLine = d3.line<HourlyData>()
            .x(d => x(d.hour))
            .y(d => y(d.load_demand))
            .curve(d3.curveMonotoneX);

        const gridLine = d3.line<HourlyData>()
            .x(d => x(d.hour))
            .y(d => y(d.grid_usage))
            .curve(d3.curveMonotoneX);

        const batteryLine = d3.line<HourlyData>()
            .x(d => x(d.hour))
            .y(d => y(d.battery_soc / 100 * maxValue))
            .curve(d3.curveMonotoneX);

        // Area under solar
        const solarArea = d3.area<HourlyData>()
            .x(d => x(d.hour))
            .y0(height)
            .y1(d => y(d.solar_generation))
            .curve(d3.curveMonotoneX);

        g.append("path")
            .datum(data)
            .attr("fill", "url(#solarGradient)")
            .attr("d", solarArea);

        // Gradients
        const defs = svg.append("defs");

        const solarGradient = defs.append("linearGradient")
            .attr("id", "solarGradient")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "0%").attr("y2", "100%");
        solarGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#fbbf24")
            .attr("stop-opacity", 0.3);
        solarGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#fbbf24")
            .attr("stop-opacity", 0);

        // Draw lines
        // Solar line
        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#fbbf24")
            .attr("stroke-width", 2)
            .attr("d", solarLine);

        // Load line
        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#f43f5e")
            .attr("stroke-width", 2)
            .attr("d", loadLine);

        // Grid line
        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#a855f7")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,4")
            .attr("d", gridLine);

        // Battery SoC line (scaled)
        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#22c55e")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "2,2")
            .attr("d", batteryLine);

        // Current hour indicator
        g.append("line")
            .attr("x1", x(currentHour))
            .attr("y1", 0)
            .attr("x2", x(currentHour))
            .attr("y2", height)
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,4")
            .attr("opacity", 0.7);

        // Current hour circle
        const currentData = data[currentHour];
        if (currentData) {
            // Solar point
            g.append("circle")
                .attr("cx", x(currentHour))
                .attr("cy", y(currentData.solar_generation))
                .attr("r", 5)
                .attr("fill", "#fbbf24")
                .attr("stroke", "#fff")
                .attr("stroke-width", 2);

            // Load point
            g.append("circle")
                .attr("cx", x(currentHour))
                .attr("cy", y(currentData.load_demand))
                .attr("r", 5)
                .attr("fill", "#f43f5e")
                .attr("stroke", "#fff")
                .attr("stroke-width", 2);

            // Grid point
            g.append("circle")
                .attr("cx", x(currentHour))
                .attr("cy", y(currentData.grid_usage))
                .attr("r", 5)
                .attr("fill", "#a855f7")
                .attr("stroke", "#fff")
                .attr("stroke-width", 2);
        }

        // Legend
        const legend = g.append("g")
            .attr("transform", `translate(${width - 100}, 5)`);

        const legendItems = [
            { color: "#fbbf24", label: "Solar" },
            { color: "#f43f5e", label: "Load" },
            { color: "#a855f7", label: "Grid" },
            { color: "#22c55e", label: "SoC" },
        ];

        legendItems.forEach((item, i) => {
            const legendRow = legend.append("g")
                .attr("transform", `translate(0, ${i * 14})`);

            legendRow.append("line")
                .attr("x1", 0)
                .attr("y1", 6)
                .attr("x2", 15)
                .attr("y2", 6)
                .attr("stroke", item.color)
                .attr("stroke-width", 2);

            legendRow.append("text")
                .attr("x", 20)
                .attr("y", 9)
                .attr("fill", "#94a3b8")
                .attr("font-size", "9px")
                .text(item.label);
        });

    }, [data, currentHour, strategy]);

    if (data.length === 0) {
        return (
            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Energy Flow Chart</h3>
                <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
                    Run simulation to see energy flow
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center justify-between">
                <span>24-Hour Energy Flow</span>
                <span className={`text-xs px-2 py-1 rounded ${strategy === "smart"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/20 text-rose-400"
                    }`}>
                    {strategy === "smart" ? "Smart" : "Baseline"}
                </span>
            </h3>
            <svg ref={svgRef} className="w-full" />
        </div>
    );
}
