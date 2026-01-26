"""
Microgrid Digital Twin - FastAPI Backend
=========================================
REST API for the microgrid simulation engine.
Provides endpoints for running energy simulations with configurable parameters.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from simulation import MicrogridSimulator, SimulationConfig


# ============================================
# FastAPI Application Setup
# ============================================
app = FastAPI(
    title="Microgrid Digital Twin API",
    description="Simulate 24-hour microgrid energy cycles with Solar, Battery, and Grid integration",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration - Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Next.js dev server
        "http://127.0.0.1:3000",
        "http://localhost:3001",      # Alternative port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Request/Response Models
# ============================================
class SimulationRequest(BaseModel):
    """Request model for simulation parameters - Delhi, India context."""
    battery_capacity_kwh: Optional[float] = Field(
        default=10.0,
        ge=1.0,
        le=100.0,
        description="Battery storage capacity in kWh (1-100)"
    )
    solar_capacity_kw: Optional[float] = Field(
        default=5.0,
        ge=3.0,
        le=7.0,
        description="Solar panel capacity in kW (3-7)"
    )
    weather_mode: Optional[str] = Field(
        default="sunny",
        description="Weather mode: 'sunny' (100% efficiency) or 'cloudy' (50% efficiency)"
    )
    off_peak_price: Optional[float] = Field(
        default=4.00,
        ge=2.0,
        le=10.0,
        description="Off-peak electricity price in ₹/kWh (00:00-06:00)"
    )
    standard_price: Optional[float] = Field(
        default=6.50,
        ge=3.0,
        le=12.0,
        description="Standard electricity price in ₹/kWh (06:00-18:00)"
    )
    peak_price: Optional[float] = Field(
        default=8.50,
        ge=5.0,
        le=15.0,
        description="Peak hour electricity price in ₹/kWh (18:00-22:00)"
    )
    initial_soc: Optional[float] = Field(
        default=0.50,
        ge=0.2,
        le=1.0,
        description="Initial battery State of Charge (0.2-1.0)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "battery_capacity_kwh": 10.0,
                "solar_capacity_kw": 5.0,
                "weather_mode": "sunny",
                "off_peak_price": 4.00,
                "standard_price": 6.50,
                "peak_price": 8.50,
                "initial_soc": 0.50
            }
        }


# ============================================
# API Endpoints
# ============================================
@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "online",
        "service": "Microgrid Digital Twin API",
        "version": "1.0.0"
    }


@app.post("/simulate")
async def run_simulation(request: SimulationRequest = None):
    """
    Run a 24-hour microgrid simulation.
    
    Compares Baseline strategy (no battery usage) vs Smart strategy
    (intelligent battery dispatch with peak shaving).
    
    Returns hourly data for both strategies plus summary metrics
    including cost savings and grid usage reduction.
    """
    try:
        # Use defaults if no request body provided
        if request is None:
            request = SimulationRequest()
        
        # Create configuration from request
        config = SimulationConfig(
            battery_capacity_kwh=request.battery_capacity_kwh,
            solar_capacity_kw=request.solar_capacity_kw,
            weather_mode=request.weather_mode,
            off_peak_price=request.off_peak_price,
            standard_price=request.standard_price,
            peak_price=request.peak_price,
            initial_soc=request.initial_soc
        )
        
        # Run simulation
        simulator = MicrogridSimulator(config)
        results = simulator.run_comparison()
        
        return results
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Simulation error: {str(e)}"
        )


@app.get("/simulate/default")
async def run_default_simulation():
    """
    Run simulation with default parameters.
    
    Convenience endpoint for quick testing without request body.
    Uses: 10 kWh battery, $0.25 peak, $0.10 off-peak pricing.
    """
    simulator = MicrogridSimulator()
    return simulator.run_comparison()


@app.get("/config/defaults")
async def get_default_config():
    """Get default simulation configuration values."""
    config = SimulationConfig()
    return {
        "battery_capacity_kwh": config.battery_capacity_kwh,
        "battery_efficiency": config.battery_efficiency,
        "min_soc": config.min_soc,
        "max_soc": config.max_soc,
        "initial_soc": config.initial_soc,
        "peak_price": config.peak_price,
        "off_peak_price": config.off_peak_price,
        "peak_hours": config.peak_hours
    }


# ============================================
# Run with Uvicorn
# ============================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
