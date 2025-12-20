# AI assisted development
"""
Generate dummy attendance data from November 20 to December 31 with varying WFO/WFH compliance and late stays
"""
import json
from datetime import datetime, timedelta
import random

# Load employees data
with open('data/employees.json', 'r', encoding='utf-8') as f:
    employees_data = json.load(f)

employees = employees_data['employees']
wfo_employees = [e for e in employees if e.get('Mode_of_work', 'WFO').upper() == 'WFO']
wfh_employees = [e for e in employees if e.get('Mode_of_work', 'WFO').upper() == 'WFH']

print(f"Total employees: {len(employees)}")
print(f"WFO employees: {len(wfo_employees)}")
print(f"WFH employees: {len(wfh_employees)}")

# Generate data from November 20 to December 31
all_attendance_data = []
start_date = datetime(2025, 11, 20)
end_date = datetime(2025, 12, 31)

# Calculate number of days
total_days = (end_date - start_date).days + 1

# Define varying patterns for each day
# Day patterns: (wfo_present_ratio, wfh_present_ratio, late_stay_ratio)
# We'll create patterns for all days from Nov 20 to Dec 31 (42 days)
day_patterns = [
    (0.95, 0.90, 0.35),  # Day 1: High WFO, good WFH, moderate late stays
    (0.88, 0.85, 0.42),  # Day 2: Lower WFO, lower WFH, more late stays
    (0.92, 0.88, 0.38),  # Day 3: Good WFO, good WFH, moderate late stays
    (0.85, 0.80, 0.45),  # Day 4: Lower compliance, more late stays
    (0.98, 0.95, 0.30),  # Day 5: Excellent compliance, fewer late stays
    (0.90, 0.87, 0.40),  # Day 6: Good compliance, moderate late stays
    (0.82, 0.75, 0.50),  # Day 7: Lower compliance, many late stays
    (0.93, 0.90, 0.35),  # Day 8: Good compliance, moderate late stays
    (0.87, 0.83, 0.43),  # Day 9: Moderate compliance, more late stays
    (0.95, 0.92, 0.32),  # Day 10: High compliance, fewer late stays
    (0.91, 0.88, 0.37),  # Day 11: Good compliance
    (0.86, 0.82, 0.44),  # Day 12: Moderate compliance
    (0.94, 0.91, 0.33),  # Day 13: High compliance
    (0.89, 0.86, 0.41),  # Day 14: Good compliance
    (0.84, 0.79, 0.47),  # Day 15: Lower compliance
    (0.96, 0.93, 0.31),  # Day 16: Very high compliance
    (0.88, 0.84, 0.43),  # Day 17: Moderate compliance
    (0.92, 0.89, 0.36),  # Day 18: Good compliance
    (0.87, 0.81, 0.46),  # Day 19: Moderate compliance
    (0.93, 0.90, 0.34),  # Day 20: Good compliance
    (0.90, 0.85, 0.39),  # Day 21: Good compliance
    (0.85, 0.78, 0.48),  # Day 22: Lower compliance
    (0.94, 0.91, 0.32),  # Day 23: High compliance
    (0.91, 0.87, 0.38),  # Day 24: Good compliance
    (0.88, 0.83, 0.42),  # Day 25: Moderate compliance
    (0.95, 0.92, 0.31),  # Day 26: High compliance
    (0.89, 0.86, 0.40),  # Day 27: Good compliance
    (0.86, 0.80, 0.45),  # Day 28: Moderate compliance
    (0.92, 0.89, 0.35),  # Day 29: Good compliance
    (0.94, 0.91, 0.33),  # Day 30: High compliance
    (0.90, 0.86, 0.38),  # Day 31: Good compliance
    (0.88, 0.84, 0.41),  # Day 32: Moderate compliance
    (0.93, 0.90, 0.34),  # Day 33: Good compliance
    (0.91, 0.87, 0.37),  # Day 34: Good compliance
    (0.87, 0.82, 0.44),  # Day 35: Moderate compliance
    (0.95, 0.92, 0.31),  # Day 36: High compliance
    (0.89, 0.85, 0.39),  # Day 37: Good compliance
    (0.92, 0.88, 0.36),  # Day 38: Good compliance
    (0.86, 0.81, 0.43),  # Day 39: Moderate compliance
    (0.94, 0.91, 0.32),  # Day 40: High compliance
    (0.90, 0.87, 0.38),  # Day 41: Good compliance
    (0.96, 0.93, 0.29),  # Day 42: Very high compliance (Dec 31)
]

for day_offset in range(total_days):
    target_date = start_date + timedelta(days=day_offset)
    date_str = target_date.strftime('%Y-%m-%d')
    
    # Get pattern for this day (cycle through patterns if needed)
    pattern_index = day_offset % len(day_patterns)
    wfo_ratio, wfh_ratio, late_stay_ratio = day_patterns[pattern_index]
    
    # Calculate how many employees should be present
    wfo_present_count = int(len(wfo_employees) * wfo_ratio)
    wfh_present_count = int(len(wfh_employees) * wfh_ratio)
    
    # Select random employees to be present
    wfo_present = random.sample(wfo_employees, wfo_present_count)
    wfh_present = random.sample(wfh_employees, wfh_present_count)
    
    all_present = wfo_present + wfh_present
    
    # Generate attendance records
    attendance_records = []
    
    for emp in all_present:
        # Random check-in time (between 8:30 and 10:00)
        checkin_hour = random.randint(8, 9)
        checkin_minute = random.randint(30 if checkin_hour == 8 else 0, 59)
        checkin_time = f"{checkin_hour:02d}:{checkin_minute:02d}"
        
        # Determine if this employee will stay late
        will_stay_late = random.random() < late_stay_ratio
        
        if will_stay_late:
            # Late stay: checkout between 20:00 and 23:00
            checkout_hour = random.randint(20, 22)
            checkout_minute = random.randint(0, 59)
        else:
            # Normal: checkout between 17:00 and 19:00
            checkout_hour = random.randint(17, 18)
            checkout_minute = random.randint(0, 59)
        
        checkout_time = f"{checkout_hour:02d}:{checkout_minute:02d}"
        
        # Get office location
        office = emp.get('office_location', 'Bengaluru')
        building = 'Tower A' if office == 'Bengaluru' else 'Tower B'
        
        attendance_records.append({
            "date": date_str,
            "employee_id": emp['employee_id'],
            "checkin_time": checkin_time,
            "checkout_time": checkout_time,
            "building": building,
            "office": office
        })
    
    # Create day data
    day_data = {
        "date": date_str,
        "attendance_records": attendance_records
    }
    
    all_attendance_data.append(day_data)
    
    # Calculate actual compliance for this day
    wfo_actual = len([e for e in wfo_present])
    wfh_actual = len([e for e in wfh_present])
    late_stay_count = len([r for r in attendance_records if r['checkout_time'] >= '20:00'])
    
    wfo_compliance = (wfo_actual / len(wfo_employees) * 100) if len(wfo_employees) > 0 else 0
    wfh_compliance = (wfh_actual / len(wfh_employees) * 100) if len(wfh_employees) > 0 else 0
    
    print(f"{date_str}: WFO={wfo_compliance:.1f}% ({wfo_actual}/{len(wfo_employees)}), "
          f"WFH={wfh_compliance:.1f}% ({wfh_actual}/{len(wfh_employees)}), "
          f"Late Stays={late_stay_count}")

# Save to a new file with all days
output_data = {
    "days": all_attendance_data,
    "latest_date": all_attendance_data[-1]["date"]
}

with open('data/attendance_multi_day.json', 'w', encoding='utf-8') as f:
    json.dump(output_data, f, indent=2, ensure_ascii=False)

print(f"\nGenerated data for {len(all_attendance_data)} days")
print(f"Saved to data/attendance_multi_day.json")
print(f"Latest date: {output_data['latest_date']}")
print(f"First date: {all_attendance_data[0]['date']}")

