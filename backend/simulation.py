"""
Microgrid Digital Twin - Simulation Engine
==========================================
This module contains the core simulation logic for a 24-hour microgrid energy cycle.
It simulates the interplay between Solar PV, Battery Storage, and Grid power to meet
load demands while minimizing operational costs.

Key Components:
- Solar Generation: Time-varying PV output based on typical daily irradiance curve
- Load Demand: Residential/commercial load profile with morning and evening peaks
- Battery: Lithium-ion storage with State of Charge (SoC) constraints
- Grid: Backup power with time-of-use pricing (peak/off-peak)

Strategies:
1. Baseline: Direct solar-to-load, grid fills deficit, battery idle
2. Smart: Intelligent battery dispatch with peak shaving and solar surplus storage
"""

import numpy as np
from dataclasses import dataclass
from typing import List, Dict, Any


@dataclass
class SimulationConfig:
    """Configuration parameters for microgrid simulation - Delhi, India context."""
    battery_capacity_kwh: float = 10.0  # Total battery capacity in kWh
    battery_efficiency: float = 0.95    # Round-trip efficiency
    min_soc: float = 0.20               # Minimum State of Charge (20%)
    max_soc: float = 1.00               # Maximum State of Charge (100%)
    initial_soc: float = 0.50           # Starting SoC (50%)
    # Solar configuration
    solar_capacity_kw: float = 5.0      # Solar panel capacity (3kW or 5kW)
    weather_mode: str = "sunny"         # Weather: "sunny" (100%) or "cloudy" (50%)
    # Delhi BSES/TPDDL Time-of-Day Tariff (₹/kWh) - 3-tier pricing
    off_peak_price: float = 4.00        # Off-peak (00:00-06:00): ₹4.00/kWh
    standard_price: float = 6.50        # Standard (06:00-18:00): ₹6.50/kWh
    peak_price: float = 8.50            # Peak (18:00-22:00): ₹8.50/kWh
    peak_hours: tuple = (18, 22)        # Peak pricing hours (6 PM - 10 PM)


class MicrogridSimulator:
    """
    Microgrid simulation engine using NumPy for efficient 24-hour energy calculations.
    
    The simulator generates realistic hourly profiles for solar generation, load demand,
    and grid pricing, then applies both baseline and smart scheduling strategies to
    compare energy costs and grid dependency.
    """
    
    def __init__(self, config: SimulationConfig = None):
        """Initialize simulator with configuration parameters."""
        self.config = config or SimulationConfig()
        self.hours = np.arange(24)  # 0-23 hours
        
        # Generate base profiles
        self._generate_solar_profile()
        self._generate_load_profile()
        self._generate_price_profile()
    
    def _generate_solar_profile(self) -> None:
        """
        Generate realistic solar PV generation profile.
        
        Uses a Gaussian-like curve centered at solar noon (12:00-13:00)
        with zero generation during night hours. Scales by solar_capacity_kw
        and weather_mode (sunny=100%, cloudy=50%).
        """
        # Solar irradiance follows a bell curve during daylight hours
        # Peak at hour 12 (noon), zero before 6 AM and after 7 PM
        solar = np.zeros(24)
        # Scale peak by solar capacity (base profile assumes 5kW system produces ~7kW peak)
        capacity_factor = self.config.solar_capacity_kw / 5.0
        peak_generation = 7.0 * capacity_factor
        
        for h in range(6, 19):  # Daylight hours: 6 AM to 6 PM
            # Gaussian curve: peak at hour 12, sigma = 3
            solar[h] = peak_generation * np.exp(-0.5 * ((h - 12) / 3) ** 2)
        
        # Apply weather efficiency factor
        weather_efficiency = 1.0 if self.config.weather_mode == "sunny" else 0.5
        solar = solar * weather_efficiency
        
        # Add some realistic variation (±10%)
        np.random.seed(42)  # Reproducible results
        solar = solar * (1 + 0.1 * (np.random.random(24) - 0.5))
        solar = np.maximum(solar, 0)  # Ensure non-negative
        
        self.solar_profile = np.round(solar, 2)
    
    def _generate_load_profile(self) -> None:
        """
        Generate realistic load demand profile for Delhi residential area.
        
        Delhi-specific consumption pattern:
        - Low overnight demand (1.5-2 kW) - fans/AC on low
        - Morning peak 6-9 AM (3-4 kW) - geysers, appliances
        - Moderate midday (2.5-3 kW) - AC moderate
        - Evening peak 6-10 PM (5-7 kW) - AC, lights, TV, cooking
        - Summer peak load higher due to AC usage
        """
        # Delhi residential load pattern (kW) - Summer scenario
        load = np.array([
            1.5, 1.5, 1.5, 1.5, 2.0, 2.5,   # 0-5 AM: Night low (fans/AC)
            3.5, 4.0, 4.5, 3.5, 3.0, 2.5,   # 6-11 AM: Morning (geyser, cooking)
            2.5, 2.5, 3.0, 3.5, 4.0, 5.0,   # 12-5 PM: Afternoon (AC ramps up)
            6.5, 7.0, 6.5, 5.5, 4.0, 2.5    # 6-11 PM: Evening peak (AC, lights, TV)
        ])
        
        # Add small random variation (±5%)
        np.random.seed(43)
        load = load * (1 + 0.05 * (np.random.random(24) - 0.5))
        
        self.load_profile = np.round(load, 2)
    
    def _generate_price_profile(self) -> None:
        """
        Generate 3-tier time-of-use electricity pricing for Delhi.
        
        Off-Peak (00:00-06:00): ₹4.00/kWh - Night rates
        Standard (06:00-18:00): ₹6.50/kWh - Daytime rates
        Peak (18:00-22:00): ₹8.50/kWh - Evening peak rates
        """
        price = np.zeros(24)
        
        for h in range(24):
            if h < 6:  # Off-peak: 00:00-06:00
                price[h] = self.config.off_peak_price
            elif h < 18:  # Standard: 06:00-18:00
                price[h] = self.config.standard_price
            elif h < 22:  # Peak: 18:00-22:00
                price[h] = self.config.peak_price
            else:  # Off-peak: 22:00-24:00
                price[h] = self.config.off_peak_price
        
        self.price_profile = price
    
    def simulate_baseline(self) -> List[Dict[str, Any]]:
        """
        Run baseline strategy simulation.
        
        Strategy:
        - Meet load directly from solar when available
        - Any deficit is purchased from the grid
        - Battery remains idle (no charging/discharging)
        - Excess solar is wasted (no storage)
        
        Returns:
            List of 24 hourly records with energy metrics and costs
        """
        results = []
        
        for hour in range(24):
            solar = self.solar_profile[hour]
            load = self.load_profile[hour]
            price = self.price_profile[hour]
            
            # Energy balance: Solar meets load, grid fills deficit
            solar_used = min(solar, load)
            grid_usage = max(0, load - solar)
            solar_excess = max(0, solar - load)  # Wasted in baseline
            
            # Cost calculation
            cost = grid_usage * price
            
            results.append({
                "hour": int(hour),
                "solar_generation": round(solar, 2),
                "load_demand": round(load, 2),
                "solar_used": round(solar_used, 2),
                "solar_excess": round(solar_excess, 2),
                "grid_usage": round(grid_usage, 2),
                "battery_charge": 0.0,
                "battery_discharge": 0.0,
                "battery_soc": round(self.config.initial_soc * 100, 1),  # Static SoC
                "grid_price": round(price, 3),
                "hourly_cost": round(cost, 3),
                "is_peak_hour": bool(self.config.peak_hours[0] <= hour < self.config.peak_hours[1])
            })
        
        return results
    
    def simulate_smart(self) -> List[Dict[str, Any]]:
        """
        Run smart scheduling strategy simulation.
        
        Strategy:
        1. CHARGING: When Solar > Load and SoC < 100%:
           - Use excess solar to charge battery (respecting max SoC)
        
        2. DISCHARGING: During peak price hours when SoC > 20%:
           - Discharge battery to meet load deficit (prioritize over grid)
           - Reduces expensive grid purchases during peak hours
        
        3. GRID BACKUP: Only use grid when:
           - Solar + Battery discharge insufficient for load
        
        This achieves "Peak Shaving" - reducing grid dependency during
        expensive peak hours by utilizing stored solar energy.
        
        Returns:
            List of 24 hourly records with energy metrics and costs
        """
        results = []
        
        # Battery state tracking
        soc = self.config.initial_soc  # Current State of Charge (0-1)
        capacity = self.config.battery_capacity_kwh
        efficiency = self.config.battery_efficiency
        min_soc = self.config.min_soc
        max_soc = self.config.max_soc
        
        for hour in range(24):
            solar = self.solar_profile[hour]
            load = self.load_profile[hour]
            price = self.price_profile[hour]
            is_peak = self.config.peak_hours[0] <= hour < self.config.peak_hours[1]
            
            # Initialize hourly values
            solar_used = 0.0
            grid_usage = 0.0
            battery_charge = 0.0
            battery_discharge = 0.0
            
            # ========================================
            # STEP 1: Direct Solar to Load
            # ========================================
            solar_used = min(solar, load)
            remaining_load = load - solar_used
            solar_excess = max(0, solar - load)
            
            # ========================================
            # STEP 2: Handle Solar Excess (Charge Battery)
            # ========================================
            if solar_excess > 0 and soc < max_soc:
                # Calculate available storage capacity
                available_capacity = (max_soc - soc) * capacity
                # Energy that can be stored (accounting for efficiency)
                energy_to_store = min(solar_excess * efficiency, available_capacity)
                # Update battery state
                battery_charge = energy_to_store
                soc += energy_to_store / capacity
                soc = min(soc, max_soc)  # Clamp to max
            
            # ========================================
            # STEP 3: Meet Remaining Load
            # ========================================
            if remaining_load > 0:
                # During peak hours: Prioritize battery discharge
                if is_peak and soc > min_soc:
                    # Available battery energy
                    available_energy = (soc - min_soc) * capacity
                    # Discharge what we can (accounting for efficiency)
                    battery_discharge = min(remaining_load, available_energy * efficiency)
                    # Update battery state
                    actual_discharge = battery_discharge / efficiency
                    soc -= actual_discharge / capacity
                    soc = max(soc, min_soc)  # Clamp to min
                    remaining_load -= battery_discharge
                
                # Grid fills any remaining deficit
                grid_usage = max(0, remaining_load)
            
            # ========================================
            # STEP 4: Calculate Hourly Cost
            # ========================================
            cost = grid_usage * price
            
            results.append({
                "hour": int(hour),
                "solar_generation": round(solar, 2),
                "load_demand": round(load, 2),
                "solar_used": round(solar_used, 2),
                "solar_excess": round(max(0, solar - load - battery_charge), 2),
                "grid_usage": round(grid_usage, 2),
                "battery_charge": round(battery_charge, 2),
                "battery_discharge": round(battery_discharge, 2),
                "battery_soc": round(soc * 100, 1),  # Percentage
                "grid_price": round(price, 3),
                "hourly_cost": round(cost, 3),
                "is_peak_hour": bool(is_peak)
            })
        
        return results
    
    def run_comparison(self) -> Dict[str, Any]:
        """
        Run both strategies and return comparative analysis.
        
        Returns:
            Dictionary containing:
            - baseline_data: 24-hour baseline simulation results
            - smart_data: 24-hour smart strategy results
            - summary: Cost comparison and savings metrics
        """
        baseline_results = self.simulate_baseline()
        smart_results = self.simulate_smart()
        
        # Calculate totals
        baseline_total_cost = sum(r["hourly_cost"] for r in baseline_results)
        smart_total_cost = sum(r["hourly_cost"] for r in smart_results)
        
        baseline_grid_usage = sum(r["grid_usage"] for r in baseline_results)
        smart_grid_usage = sum(r["grid_usage"] for r in smart_results)
        
        cost_saved = baseline_total_cost - smart_total_cost
        cost_saved_percent = (cost_saved / baseline_total_cost * 100) if baseline_total_cost > 0 else 0
        
        grid_reduced = baseline_grid_usage - smart_grid_usage
        grid_reduced_percent = (grid_reduced / baseline_grid_usage * 100) if baseline_grid_usage > 0 else 0
        
        return {
            "baseline_data": baseline_results,
            "smart_data": smart_results,
            "summary": {
                "baseline_total_cost": round(baseline_total_cost, 2),
                "smart_total_cost": round(smart_total_cost, 2),
                "cost_saved": round(cost_saved, 2),
                "cost_saved_percent": round(cost_saved_percent, 1),
                "baseline_grid_usage": round(baseline_grid_usage, 2),
                "smart_grid_usage": round(smart_grid_usage, 2),
                "grid_reduced": round(grid_reduced, 2),
                "grid_reduced_percent": round(grid_reduced_percent, 1),
                "battery_capacity_kwh": self.config.battery_capacity_kwh,
                "peak_price": self.config.peak_price,
                "off_peak_price": self.config.off_peak_price
            }
        }


# Utility function for quick testing
if __name__ == "__main__":
    simulator = MicrogridSimulator()
    results = simulator.run_comparison()
    
    print("=== MICROGRID SIMULATION RESULTS (Delhi, India) ===\n")
    print(f"Battery Capacity: {results['summary']['battery_capacity_kwh']} kWh")
    print(f"Peak Price: ₹{results['summary']['peak_price']}/kWh")
    print(f"Off-Peak Price: ₹{results['summary']['off_peak_price']}/kWh")
    print()
    print(f"Baseline Total Cost: ₹{results['summary']['baseline_total_cost']:.2f}")
    print(f"Smart Strategy Cost: ₹{results['summary']['smart_total_cost']:.2f}")
    print(f"Cost Saved: ₹{results['summary']['cost_saved']:.2f} ({results['summary']['cost_saved_percent']:.1f}%)")
    print()
    print(f"Grid Usage Reduction: {results['summary']['grid_reduced']:.1f} kWh ({results['summary']['grid_reduced_percent']:.1f}%)")
