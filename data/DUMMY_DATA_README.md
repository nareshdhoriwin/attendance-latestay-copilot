# AI assisted development
# Dummy Data for Last 10 Days

## Overview
This document describes the dummy data generated for the last 10 days showing varying WFO/WFH compliance and late stay patterns.

## Generated Data File
- **File**: `data/attendance_multi_day.json`
- **Format**: Multi-day attendance data with date-wise records
- **Date Range**: November 20 to December 31, 2025 (42 days)

## Data Structure
```json
{
  "days": [
    {
      "date": "2025-12-10",
      "attendance_records": [
        {
          "date": "2025-12-10",
          "employee_id": "E1001",
          "checkin_time": "09:00",
          "checkout_time": "18:30",
          "building": "Tower A",
          "office": "Bengaluru"
        },
        ...
      ]
    },
    ...
  ],
  "latest_date": "2025-12-19"
}
```

## Daily Compliance Patterns

The data includes 30 days of attendance records with varying compliance patterns. Here are sample days:

| Date | WFO Compliance | WFH Compliance | Late Stays |
|------|----------------|----------------|------------|
| 2025-11-20 | 94.0% (47/50) | 90.0% (45/50) | 34 |
| 2025-11-25 | 90.0% (45/50) | 86.0% (43/50) | 32 |
| 2025-12-01 | 86.0% (43/50) | 82.0% (41/50) | 34 |
| 2025-12-05 | 96.0% (48/50) | 92.0% (46/50) | 24 |
| 2025-12-10 | 90.0% (45/50) | 84.0% (42/50) | 40 |
| 2025-12-15 | 94.0% (47/50) | 92.0% (46/50) | 22 |
| 2025-12-19 | 94.0% (47/50) | 90.0% (45/50) | 28 |

*Note: Full 42 days of data available from 2025-11-20 to 2025-12-31*

## Features

### 1. Varying WFO Compliance
- Range: 82% to 98%
- Shows realistic day-to-day variations
- Different employees present each day

### 2. Varying WFH Compliance
- Range: 74% to 94%
- Independent from WFO compliance
- Different patterns for work-from-home employees

### 3. Varying Late Stay Counts
- Range: 23 to 40 employees
- Realistic distribution across days
- Some days have more late stays (e.g., Day 7: 40), others fewer (e.g., Day 5: 32)

## How to Use

### 1. View Data for a Specific Date
The backend APIs now support date filtering:
```
GET /api/attendance/records?date=2025-12-15
GET /api/late-stay/after-8pm?date=2025-12-15
GET /api/reports/wfo-compliance?date=2025-12-15
```

### 2. View Latest Data (Default)
If no date is specified, the API returns data for the latest date (2025-12-19, or most recent date in the data):
```
GET /api/attendance/records
GET /api/late-stay/after-8pm
GET /api/reports/wfo-compliance
```

### 3. In the Dashboard
- Use the date picker to select any date from November 20 to December 31, 2025
- The dashboard will automatically fetch and display:
  - WFO compliance for that date
  - WFH compliance for that date
  - Late stay counts for that date
  - Attendance records for that date

## Regenerating Data

To regenerate the dummy data with different patterns:
```bash
python generate_dummy_data.py
```

This will:
1. Load employee data from `data/employees.json`
2. Generate attendance records for the last 10 days
3. Create varying compliance patterns
4. Save to `data/attendance_multi_day.json`

## Backend Support

The backend has been updated to support both:
- **Single-day format**: `attendance.json` (original format)
- **Multi-day format**: `attendance_multi_day.json` (new format)

The APIs automatically detect and use the appropriate format based on the date parameter.

## Notes

- Total employees: 100 (50 WFO, 50 WFH)
- Each day has different employees present
- Late stay times are between 20:00 and 23:00
- Normal checkout times are between 17:00 and 19:00
- Check-in times are between 8:30 and 10:00

