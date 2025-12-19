# Setup Instructions

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- A modern web browser (Chrome, Firefox, Edge, etc.)

## Installation Steps

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd attendance-latestay-copilot
```

### 2. Create Virtual Environment (Recommended)

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Application

**Option 1: Using the run script**
```bash
python run.py
```

**Option 2: Using uvicorn directly**
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Access the Dashboard

Once the server is running, open your browser and navigate to:

- **Dashboard**: http://localhost:8000/
- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **Alternative API Docs**: http://localhost:8000/redoc

## Project Structure

```
attendance-latestay-copilot/
├── agent/              # AI Copilot logic and prompts
├── backend/            # FastAPI backend
│   ├── attendance_api/ # Attendance endpoints
│   ├── late_stay_api/  # Late stay endpoints
│   └── reports/        # Reports endpoints
├── frontend/           # Dashboard frontend
│   └── dashboard/      # HTML/CSS/JS dashboard
├── data/               # Sample JSON data files
├── docs/               # Documentation
├── requirements.txt    # Python dependencies
└── run.py             # Quick start script
```

## API Endpoints

### Attendance API
- `GET /api/attendance/summary?employee_id={id}` - Get attendance summary for employee
- `GET /api/attendance/records?date={date}` - Get all attendance records
- `GET /api/attendance/daily-count?date={date}` - Get daily people count

### Late Stay API
- `GET /api/late-stay/after-8pm?date={date}` - Get employees who stayed after 8 PM
- `GET /api/late-stay/women-after-8pm?date={date}` - Get women employees who stayed after 8 PM

### Reports API
- `GET /api/reports/work-balance/project/{project_id}` - Get work balance by project
- `GET /api/reports/wfo-compliance?date={date}` - Get WFO compliance report
- `GET /api/reports/wellbeing-recommendations?employee_id={id}` - Get wellbeing recommendations

## Troubleshooting

### Port Already in Use
If port 8000 is already in use, you can change it:
```bash
uvicorn backend.main:app --reload --port 8001
```
Then update the API_BASE_URL in `frontend/dashboard/dashboard.js` to `http://localhost:8001/api`

### CORS Issues
If you encounter CORS errors, make sure the backend is running and the frontend is accessing it from the correct URL.

### Data Not Loading
- Ensure the `data/` folder contains the JSON files (employees.json, projects.json, attendance.json)
- Check the browser console for any error messages
- Verify the API endpoints are accessible at http://localhost:8000/api/...

## Development

The application uses:
- **Backend**: FastAPI (Python)
- **Frontend**: Vanilla JavaScript with Chart.js
- **Data**: JSON files (can be replaced with database in production)

For development with auto-reload:
```bash
uvicorn backend.main:app --reload
```

## Next Steps

1. Integrate with face recognition system
2. Connect to a database (PostgreSQL, MongoDB, etc.)
3. Add authentication and authorization
4. Deploy to cloud (AWS, Azure, GCP)
5. Add more advanced analytics and AI features

