"""
Reports API Routes
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

def calculate_hours(checkin: str, checkout: str) -> float:
    """Calculate total work hours as float"""
    try:
        checkin_time = datetime.strptime(checkin, "%H:%M")
        checkout_time = datetime.strptime(checkout, "%H:%M")
        
        if checkout_time < checkin_time:
            checkout_time = datetime.strptime(checkout, "%H:%M").replace(day=2)
            checkin_time = datetime.strptime(checkin, "%H:%M").replace(day=1)
        
        diff = checkout_time - checkin_time
        return diff.seconds / 3600.0
    except:
        return 0.0

def is_after_8pm(time_str: str) -> bool:
    """Check if time is after 8:00 PM"""
    try:
        time_obj = datetime.strptime(time_str, "%H:%M")
        return time_obj >= datetime.strptime("20:00", "%H:%M")
    except:
        return False

@router.get("/work-balance/project/{project_id}")
async def get_work_balance_by_project(
    project_id: str,
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    """
    Get work balance report for a project
    """
    employees_data = load_json_file("employees.json")
    projects_data = load_json_file("projects.json")
    
    # Find project
    project = next((p for p in projects_data["projects"] if p["project_id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    
    # Get employees in this project
    project_employees = [e for e in employees_data["employees"] if e["project_id"] == project_id]
    employee_ids = {e["employee_id"] for e in project_employees}
    
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
                file_date = None
        except:
            attendance_records = []
            file_date = None
    
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
    
    # Get attendance records for project employees
    project_attendance = [
        r for r in attendance_records
        if r.get("employee_id") in employee_ids
    ]
    
    # Calculate statistics
    total_hours = 0
    late_night_count = 0
    
    for record in project_attendance:
        hours = calculate_hours(record["checkin_time"], record["checkout_time"])
        total_hours += hours
        if is_after_8pm(record["checkout_time"]):
            late_night_count += 1
    
    avg_hours = total_hours / len(project_attendance) if project_attendance else 0
    late_night_frequency = "High" if late_night_count > len(project_attendance) * 0.3 else "Medium" if late_night_count > 0 else "Low"
    
    # Generate recommendation
    recommendation = "Work hours are balanced"
    if avg_hours > 10 and late_night_count > 0:
        recommendation = "Introduce shift rotation and mandatory rest days"
    elif late_night_count > len(project_attendance) * 0.5:
        recommendation = "High late-night work detected. Consider workload redistribution"
    
    hours_str = f"{int(avg_hours)}h {int((avg_hours % 1) * 60)}m"
    
    return {
        "project_id": project_id,
        "project_name": project["project_name"],
        "average_work_hours": hours_str,
        "total_employees": len(project_employees),
        "late_night_frequency": late_night_frequency,
        "late_night_count": late_night_count,
        "requires_night_shift": project.get("requires_night_shift", False),
        "recommendation": recommendation,
        "date": date or file_date
    }

@router.get("/wfo-compliance")
async def get_wfo_compliance(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    """
    Get Work From Office compliance report with separate WFO and WFH compliance.
    This endpoint calculates compliance separately for WFO and WFH employees based on their Mode_of_work.
    """
    try:
        employees_data = load_json_file("employees.json")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading employees file: {str(e)}")
    
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
                file_date = None
        except:
            attendance_records = []
            file_date = None
    
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
    
    # Create employee lookup with mode of work - separate WFO and WFH employees
    employee_lookup = {}
    wfo_employees = []  # List of employee IDs who should work from office
    wfh_employees = []  # List of employee IDs who should work from home
    
    for emp in employees_data.get("employees", []):
        emp_id = emp.get("employee_id")
        if not emp_id:
            continue  # Skip employees without ID
        
        employee_lookup[emp_id] = emp
        
        # Get Mode_of_work field (case-insensitive, default to WFO if not specified)
        mode = emp.get("Mode_of_work", "WFO")
        if isinstance(mode, str):
            mode = mode.upper().strip()
        else:
            mode = "WFO"  # Default to WFO if not a string
        
        # Categorize employees by work mode
        if mode == "WFO":
            wfo_employees.append(emp_id)
        elif mode == "WFH":
            wfh_employees.append(emp_id)
        else:
            # If mode is neither WFO nor WFH, default to WFO
            wfo_employees.append(emp_id)
    
    # Get present employee IDs from attendance records
    present_employee_ids = set()
    for record in attendance_records:
        emp_id = record.get("employee_id")
        if emp_id:
            present_employee_ids.add(emp_id)
    
    # Calculate WFO and WFH present counts
    wfo_total = len(wfo_employees)
    wfo_present = len([eid for eid in wfo_employees if eid in present_employee_ids])
    wfo_absent = wfo_total - wfo_present
    
    wfh_total = len(wfh_employees)
    wfh_present = len([eid for eid in wfh_employees if eid in present_employee_ids])
    wfh_absent = wfh_total - wfh_present
    
    # Calculate compliance as percentage of total present employees (so they sum to 100%)
    total_present = len(present_employee_ids)
    wfo_compliance_pct = (wfo_present / total_present * 100) if total_present > 0 else 0.0
    wfh_compliance_pct = (wfh_present / total_present * 100) if total_present > 0 else 0.0
    
    # Overall compliance: Total employees present vs total employees
    total_employees = len(employees_data.get("employees", []))
    present_employees = len(present_employee_ids)
    absent_employees = total_employees - present_employees
    overall_compliance = (present_employees / total_employees * 100) if total_employees > 0 else 0.0
    
    # Determine status
    status = "Compliant" if overall_compliance >= 80 else "Non-Compliant"
    
    return {
        "date": date or file_date,
        "total_employees": total_employees,
        "present_employees": present_employees,
        "absent_employees": absent_employees,
        "compliance_percentage": round(overall_compliance, 2),
        # WFO-specific metrics
        "wfo_total": wfo_total,
        "wfo_present": wfo_present,
        "wfo_absent": wfo_absent,
        "wfo_compliance_percentage": round(wfo_compliance_pct, 2),
        # WFH-specific metrics
        "wfh_total": wfh_total,
        "wfh_present": wfh_present,
        "wfh_absent": wfh_absent,
        "wfh_compliance_percentage": round(wfh_compliance_pct, 2),
        # Additional info for verification
        "total_present": total_present,
        "status": status
    }

@router.get("/wellbeing-recommendations")
async def get_wellbeing_recommendations(
    employee_id: Optional[str] = Query(None, description="Employee ID (optional)"),
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    """
    Get wellbeing recommendations based on work patterns
    """
    employees_data = load_json_file("employees.json")
    
    attendance_records = []
    try:
        multi_day_data = load_json_file("attendance_multi_day.json")
        if isinstance(multi_day_data, dict) and "days" in multi_day_data:
            target_date = date or multi_day_data.get("latest_date")
            if target_date:
                day_data = next((d for d in multi_day_data["days"] if d.get("date") == target_date), None)
                if day_data:
                    attendance_records = day_data.get("attendance_records", [])
        elif isinstance(multi_day_data, list):
            target_date = date
            if target_date:
                day_data = next((d for d in multi_day_data if d.get("date") == target_date), None)
                if day_data:
                    attendance_records = day_data.get("attendance_records", [])
    except:
        try:
            attendance_data = load_json_file("attendance.json")
            if isinstance(attendance_data, dict) and "attendance_records" in attendance_data:
                attendance_records = attendance_data["attendance_records"]
            elif isinstance(attendance_data, list):
                attendance_records = attendance_data
        except:
            attendance_records = []
    
    recommendations = []
    
    if employee_id:
        employee = next((e for e in employees_data.get("employees", []) if e.get("employee_id") == employee_id), None)
        if not employee:
            raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found")
        
        records = [r for r in attendance_records if r.get("employee_id") == employee_id]
        if records:
            record = records[0]
            hours = calculate_hours(record.get("checkin_time", "00:00"), record.get("checkout_time", "00:00"))
            
            if hours > 10:
                recommendations.append({
                    "type": "work_hours",
                    "message": "You've worked more than 10 hours today. Consider taking breaks and maintaining work-life balance.",
                    "priority": "high"
                })
            
            if is_after_8pm(record.get("checkout_time", "")):
                recommendations.append({
                    "type": "late_stay",
                    "message": "You stayed late today. Ensure you have safe transportation arranged.",
                    "priority": "medium"
                })
    else:
        recommendations.append({
            "type": "general",
            "message": "Maintain regular work hours and take adequate breaks for optimal productivity.",
            "priority": "low"
        })
    
    return {
        "employee_id": employee_id,
        "recommendations": recommendations
    }

