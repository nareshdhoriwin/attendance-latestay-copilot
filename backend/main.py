"""
Main FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from backend.attendance_api.routes import router as attendance_router
from backend.late_stay_api.routes import router as late_stay_router
from backend.reports.routes import router as reports_router

app = FastAPI(
    title="Attendance & Late-Stay Copilot API",
    description="AI Copilot for Automated Attendance & Late-Stay Monitoring",
    version="1.0.0"
)

# CORS middleware to allow frontend to access APIs
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(attendance_router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(late_stay_router, prefix="/api/late-stay", tags=["Late Stay"])
app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])

# Serve static files (dashboard)
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
static_dir = BASE_DIR / "frontend" / "dashboard"

if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/")
async def root():
    """Serve dashboard"""
    dashboard_path = static_dir / "index.html"
    if dashboard_path.exists():
        return FileResponse(str(dashboard_path))
    return {"message": "Attendance & Late-Stay Copilot API", "status": "running", "dashboard": "Not found"}

# Note: Static files are served via /static/ mount point

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "attendance-latestay-copilot"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

