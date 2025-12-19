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
async def get_work_balance_by_project(project_id: str):
    """
    Get work balance report for a project
    """
    attendance_data = load_json_file("attendance.json")
    employees_data = load_json_file("employees.json")
    projects_data = load_json_file("projects.json")
    
    # Find project
    project = next((p for p in projects_data["projects"] if p["project_id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    
    # Get employees in this project
    project_employees = [e for e in employees_data["employees"] if e["project_id"] == project_id]
    employee_ids = {e["employee_id"] for e in project_employees}
    
    # Get attendance records for project employees
    project_attendance = [
        r for r in attendance_data["attendance_records"]
        if r["employee_id"] in employee_ids
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
        "recommendation": recommendation
    }

@router.get("/wfo-compliance")
async def get_wfo_compliance(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    """
    Get Work From Office compliance report
    """
    attendance_data = load_json_file("attendance.json")
    employees_data = load_json_file("employees.json")
    
    total_employees = len(employees_data["employees"])
    present_employees = len(attendance_data["attendance_records"])
    
    compliance_percentage = (present_employees / total_employees * 100) if total_employees > 0 else 0
    
    return {
        "date": date or attendance_data["date"],
        "total_employees": total_employees,
        "present_employees": present_employees,
        "absent_employees": total_employees - present_employees,
        "compliance_percentage": round(compliance_percentage, 2),
        "status": "Compliant" if compliance_percentage >= 80 else "Non-Compliant"
    }

@router.get("/wellbeing-recommendations")
async def get_wellbeing_recommendations(
    employee_id: Optional[str] = Query(None, description="Employee ID (optional)")
):
    """
    Get wellbeing recommendations based on work patterns
    """
    attendance_data = load_json_file("attendance.json")
    employees_data = load_json_file("employees.json")
    
    recommendations = []
    
    if employee_id:
        # Get recommendations for specific employee
        employee = next((e for e in employees_data["employees"] if e["employee_id"] == employee_id), None)
        if not employee:
            raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found")
        
        records = [r for r in attendance_data["attendance_records"] if r["employee_id"] == employee_id]
        if records:
            record = records[0]
            hours = calculate_hours(record["checkin_time"], record["checkout_time"])
            
            if hours > 10:
                recommendations.append({
                    "type": "work_hours",
                    "message": "You've worked more than 10 hours today. Consider taking breaks and maintaining work-life balance.",
                    "priority": "high"
                })
            
            if is_after_8pm(record["checkout_time"]):
                recommendations.append({
                    "type": "late_stay",
                    "message": "You stayed late today. Ensure you have safe transportation arranged.",
                    "priority": "medium"
                })
    else:
        # General recommendations
        recommendations.append({
            "type": "general",
            "message": "Maintain regular work hours and take adequate breaks for optimal productivity.",
            "priority": "low"
        })
    
    return {
        "employee_id": employee_id,
        "recommendations": recommendations
    }

