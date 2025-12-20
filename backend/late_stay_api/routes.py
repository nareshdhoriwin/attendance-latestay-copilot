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
    Supports both single-day attendance.json and multi-day attendance_multi_day.json
    """
    employees_data = load_json_file("employees.json")
    
    # Try to load multi-day data first, fallback to single-day
    attendance_records = []
    file_date = None
    
    try:
        multi_day_data = load_json_file("attendance_multi_day.json")
        if isinstance(multi_day_data, dict) and "days" in multi_day_data:
            # Multi-day format
            target_date = date or multi_day_data.get("latest_date")
            if target_date:
                # Find the day data
                day_data = next((d for d in multi_day_data["days"] if d.get("date") == target_date), None)
                if day_data:
                    attendance_records = day_data.get("attendance_records", [])
                    file_date = day_data.get("date")
        elif isinstance(multi_day_data, list):
            # If it's a list of days
            target_date = date
            if target_date:
                day_data = next((d for d in multi_day_data if d.get("date") == target_date), None)
                if day_data:
                    attendance_records = day_data.get("attendance_records", [])
                    file_date = day_data.get("date")
    except:
        # Fallback to single-day file
        try:
            attendance_data = load_json_file("attendance.json")
            if isinstance(attendance_data, dict) and "attendance_records" in attendance_data:
                attendance_records = attendance_data["attendance_records"]
                file_date = attendance_data.get("date")
            elif isinstance(attendance_data, list):
                attendance_records = attendance_data
        except:
            attendance_records = []
    
    # If no date specified and we have multi-day data, use latest
    if not date and not file_date:
        try:
            multi_day_data = load_json_file("attendance_multi_day.json")
            if isinstance(multi_day_data, dict) and "days" in multi_day_data:
                latest_day = multi_day_data["days"][-1] if multi_day_data["days"] else None
                if latest_day:
                    attendance_records = latest_day.get("attendance_records", [])
                    file_date = latest_day.get("date")
        except:
            pass
    
    # Create employee lookup
    employee_lookup = {e["employee_id"]: e for e in employees_data["employees"]}
    
    late_stay_employees = []
    
    for record in attendance_records:
        if is_after_8pm(record.get("checkout_time", "")):
            employee = employee_lookup.get(record.get("employee_id"), {})
            late_stay_employees.append({
                "employee_id": record.get("employee_id"),
                "name": employee.get("name", ""),
                "gender": employee.get("gender", ""),
                "checkout_time": record.get("checkout_time"),
                "project_id": employee.get("project_id", ""),
                "office": record.get("office", "")
            })
    
    return {
        "date": date or file_date,
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

