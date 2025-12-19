# Data Files

This directory contains sample data files used by the Copilot agent for context, decision logic, and API response examples.

## Files

### `employees.json`
**Employee Master Data (Agent Context)**
- Contains employee information including ID, name, gender, joining date, project assignment, and office location
- Used by the agent for:
  - Gender-based late stay detection
  - Project mapping
  - Location-based insights

### `projects.json`
**Project Data (Decision Logic)**
- Contains project information including project ID, name, managers, project type, and night shift requirements
- Used by the agent for:
  - Shift allowance eligibility
  - Late-night justification
  - Project guideline recommendations

### `attendance.json`
**Attendance Transactions (Event Data)**
- Contains daily attendance records with check-in/check-out times, building, and office location
- Used by the agent for:
  - Attendance summary
  - Late arrival detection
  - Late stay after 8:00 PM detection
  - WFO compliance tracking

### `api_response_examples.json`
**API Response Examples**
- Contains example API responses that the Copilot actions should consume
- Includes examples for:
  - Attendance Summary API
  - Late Stay Detection API
  - Work Balance by Project API

## Usage

These files serve as:
1. **Agent Context**: Provides the Copilot with employee and project context
2. **Decision Logic**: Helps the agent make decisions about shift allowances, late stays, etc.
3. **Event Data**: Sample attendance transactions for testing and development
4. **API Contracts**: Reference for expected API response formats

## Note

These are sample/mock data files. In production, this data would typically come from:
- Database queries
- Real-time API calls
- Event streams from face recognition systems

