# Microgrid Digital Twin - VLabs

Interactive microgrid simulation with 3D visualization.

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Server runs on `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000/vlabs-simulation`

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **3D**: Three.js
- **Charts**: D3.js
- **Backend**: Python, FastAPI
