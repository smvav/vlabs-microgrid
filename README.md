# VLabs Microgrid Simulation

An interactive VLabs-style microgrid energy simulation with 3D visualization.

![VLabs Simulation](https://img.shields.io/badge/VLabs-Simulation-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Three.js](https://img.shields.io/badge/Three.js-3D-green)
![D3.js](https://img.shields.io/badge/D3.js-Charts-orange)

## 🎯 Features

- **3D Visualization**: Three.js-powered microgrid scene with animated energy flow
- **Real-time Charts**: D3.js 24-hour energy flow visualization
- **Interactive Controls**: Battery capacity, pricing, and SoC adjustments
- **Smart Scheduling**: Compare baseline vs intelligent energy strategies
- **VLabs Style**: Theory, Procedure, Simulation, and Analysis tabs

## 🚀 Quick Start

### Backend (Python)
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000/vlabs-simulation](http://localhost:3000/vlabs-simulation)

## 📊 Demo

The simulation demonstrates:
- Solar generation patterns (6 AM - 6 PM)
- Peak hour pricing (2 PM - 10 PM) 
- Battery charging during excess solar
- Peak shaving to reduce grid costs
- ~18% cost reduction with smart strategy

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React, TypeScript |
| 3D Graphics | Three.js |
| Charts | D3.js |
| Animations | p5.js |
| Backend | Python FastAPI |
| Styling | Tailwind CSS |

## 📁 Project Structure

```
vlabs2.0/
├── frontend/
│   ├── src/
│   │   ├── app/vlabs-simulation/   # VLabs page
│   │   └── components/
│   │       ├── VLabsSimulation.tsx  # Main component
│   │       ├── Microgrid3DScene.tsx # Three.js 3D
│   │       └── EnergyFlowD3.tsx     # D3.js charts
│   └── package.json
└── backend/
    ├── main.py                      # FastAPI server
    └── requirements.txt
```

## 📄 License

MIT License

---

Built for Virtual Labs Hackathon 2026
