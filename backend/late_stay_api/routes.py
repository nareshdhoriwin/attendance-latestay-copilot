"""
Late Stay API Routes
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime
import json
from pathlib import Path

router = APIRouter()

# Get data directory path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"

def load_json_file(filename: str):
    """Load JSON data file"""
    filepath = DATA_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail=f"Data file {filename} not found")
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def is_after_8pm(time_str: str) -> bool:
    """Check if time is after 8:00 PM"""
    try:
        time_obj = datetime.strptime(time_str, "%H:%M")
        return time_obj >= datetime.strptime("20:00", "%H:%M")
    except:
        return False

@router.get("/after-8pm")
async def get_late_stay_after_8pm(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    """
    Get employees who stayed after 8:00 PM
    """
    attendance_data = load_json_file("attendance.json")
    employees_data = load_json_file("employees.json")
    
    # Create employee lookup
    employee_lookup = {e["employee_id"]: e for e in employees_data["employees"]}
    
    late_stay_employees = []
    
    for record in attendance_data["attendance_records"]:
        if is_after_8pm(record["checkout_time"]):
            employee = employee_lookup.get(record["employee_id"], {})
            late_stay_employees.append({
                "employee_id": record["employee_id"],
                "name": employee.get("name", ""),
                "gender": employee.get("gender", ""),
                "checkout_time": record["checkout_time"],
                "project_id": employee.get("project_id", ""),
                "office": record.get("office", "")
            })
    
    return {
        "date": date or attendance_data["date"],
        "late_stay_employees": late_stay_employees,
        "total_count": len(late_stay_employees),
        "female_count": len([e for e in late_stay_employees if e["gender"] == "Female"])
    }

@router.get("/women-after-8pm")
async def get_women_late_stay(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    """
    Get women employees who stayed after 8:00 PM (safety compliance)
    """
    late_stay_data = await get_late_stay_after_8pm(date)
    
    women_late_stay = [
        emp for emp in late_stay_data["late_stay_employees"]
        if emp["gender"] == "Female"
    ]
    
    return {
        "date": late_stay_data["date"],
        "women_late_stay_employees": women_late_stay,
        "count": len(women_late_stay)
    }

