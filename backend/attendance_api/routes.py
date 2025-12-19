"""
Attendance API Routes
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, date
import json
import os
from pathlib import Path
import traceback

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

def normalize_attendance_data(attendance_data):
    """Support two shapes for attendance data:
    1) { "date": "...", "attendance_records": [ ... ] }
    2) [ {...}, {...} ]  (top-level array)
    Returns a tuple: (date_or_none, attendance_records_list)
    """
    # If attendance_data is a list, treat it as the records array
    if isinstance(attendance_data, list):
        return (None, attendance_data)

    # If it's a dict, try to extract fields with fallbacks
    if isinstance(attendance_data, dict):
        records = attendance_data.get("attendance_records")
        if records is None and any(isinstance(v, list) for v in attendance_data.values()):
            # defensive: find the first list value and use it
            for v in attendance_data.values():
                if isinstance(v, list):
                    records = v
                    break
        return (attendance_data.get("date"), records or [])

    # fallback
    return (None, [])

def calculate_hours(checkin: str, checkout: str) -> str:
    """Calculate total work hours"""
    try:
        checkin_time = datetime.strptime(checkin, "%H:%M")
        checkout_time = datetime.strptime(checkout, "%H:%M")
        
        # Handle overnight checkout
        if checkout_time < checkin_time:
            checkout_time = datetime.strptime(checkout, "%H:%M").replace(day=2)
            checkin_time = datetime.strptime(checkin, "%H:%M").replace(day=1)
        
        diff = checkout_time - checkin_time
        hours = diff.seconds // 3600
        minutes = (diff.seconds % 3600) // 60
        return f"{hours}h {minutes}m"
    except:
        return "0h 0m"

def _log_exception(exc: Exception, name: str = "attendance"):
    try:
        log_path = DATA_DIR / f"{name}_error.log"
        with open(log_path, 'a', encoding='utf-8') as lf:
            lf.write(f"\n--- {datetime.now().isoformat()} ---\n")
            lf.write(''.join(traceback.format_exception(type(exc), exc, exc.__traceback__)))
    except Exception:
        pass

@router.get("/summary")
async def get_attendance_summary(
    employee_id: str = Query(..., description="Employee ID"),
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    """
    Get attendance summary for an employee
    """
    employees_data = load_json_file("employees.json")
    attendance_data = load_json_file("attendance.json")

    # Normalize attendance data
    file_date, attendance_records = normalize_attendance_data(attendance_data)

    # Find employee
    employee = next((e for e in employees_data.get("employees", []) if e.get("employee_id") == employee_id), None)
    if not employee:
        raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found")
    
    # Find attendance record
    target_date = date or file_date
    attendance_record = next(
        (r for r in attendance_records if r.get("employee_id") == employee_id),
        None
    )
    
    if not attendance_record:
        raise HTTPException(status_code=404, detail=f"Attendance record not found for employee {employee_id}")
    
    # Check for late arrival (assuming 9:00 AM is standard)
    checkin_time = datetime.strptime(attendance_record["checkin_time"], "%H:%M")
    late_arrival = checkin_time > datetime.strptime("09:00", "%H:%M")
    
    total_hours = calculate_hours(attendance_record["checkin_time"], attendance_record["checkout_time"])
    
    return {
        "employee_id": employee_id,
        "name": employee["name"],
        "date": target_date,
        "checkin": attendance_record["checkin_time"],
        "checkout": attendance_record["checkout_time"],
        "total_hours": total_hours,
        "late_arrival": late_arrival,
        "building": attendance_record.get("building", ""),
        "office": attendance_record.get("office", "")
    }

@router.get("/records")
async def get_attendance_records(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    """
    Get all attendance records for a date
    """
    attendance_data = load_json_file("attendance.json")
    employees_data = load_json_file("employees.json")

    # Normalize attendance data shape
    file_date, attendance_records = normalize_attendance_data(attendance_data)

    # Create employee lookup
    employee_lookup = {e["employee_id"]: e for e in employees_data.get("employees", [])}

    # Enrich attendance records with employee info
    enriched_records = []
    for record in attendance_records:
        employee = employee_lookup.get(record.get("employee_id"), {})
        total_hours = calculate_hours(record.get("checkin_time", "00:00"), record.get("checkout_time", "00:00"))

        enriched_records.append({
            **record,
            "name": employee.get("name", ""),
            "gender": employee.get("gender", ""),
            "project_id": employee.get("project_id", ""),
            "total_hours": total_hours
        })

    return {
        "date": date or file_date,
        "attendance_records": enriched_records
    }

@router.get("/daily-count")
async def get_daily_count(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    """
    Get daily people count in office
    """
    attendance_data = load_json_file("attendance.json")
    file_date, attendance_records = normalize_attendance_data(attendance_data)

    return {
        "date": date or file_date,
        "total_people": len(attendance_records),
        "count_by_office": {}
    }

