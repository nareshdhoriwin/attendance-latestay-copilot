# Use Cases Documentation

## Overview
This document outlines the functional use cases for the Attendance & Late-Stay Copilot system.

## Core Use Cases

### UC-01: Automatic Attendance Recording
- **Description**: System automatically records employee check-in & check-out using face recognition and calculates work hours
- **Actors**: Employees, System
- **Flow**: Employee enters/exits → Face recognition captures event → System records attendance

### UC-02: Attendance Summary Request
- **Description**: Users can request attendance summaries on demand
- **Actors**: Employees, HR, Managers
- **Flow**: User requests summary → Copilot retrieves data → Summary displayed

### UC-03: Late Arrival Detection
- **Description**: System flags late arrivals based on shift rules
- **Actors**: System, HR, Managers
- **Flow**: Check-in time captured → Compared with shift rules → Late arrival flagged

### UC-04: Late-Stay Detection
- **Description**: System detects women employees present after 8:00 PM
- **Actors**: System, Security, HR
- **Flow**: Employee present after 8 PM → System detects → Logs event → Notifies security

### UC-05: Safe Exit Logging
- **Description**: System logs safe exit after late stay
- **Actors**: System, Security
- **Flow**: Late-stay employee exits → System logs exit time → Confirms safe exit

### UC-06: Shift Allowance Request
- **Description**: System supports shift allowance requests for project-based shifts
- **Actors**: Employees, Project Managers, HR
- **Flow**: Employee requests allowance → System validates eligibility → Request processed

### UC-07: Work Balance Reports
- **Description**: System generates project-wise work balance reports
- **Actors**: Project Managers, HR
- **Flow**: Report requested → System analyzes data → Report generated

### UC-08: Well-being Recommendations
- **Description**: System provides employee well-being recommendations
- **Actors**: Employees, HR
- **Flow**: System analyzes work patterns → Generates recommendations → Displays to user

### UC-09: WFO Compliance Tracking
- **Description**: System tracks Work From Office mandate compliance
- **Actors**: HR, Managers
- **Flow**: Attendance data analyzed → Compliance calculated → Reports generated

### UC-10: Daily People Count
- **Description**: System provides daily people count in office
- **Actors**: Security, HR, Managers
- **Flow**: Real-time attendance data → People count calculated → Displayed

