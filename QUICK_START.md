# 🚀 Quick Start Guide

## Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

## Step 2: Run the Application

```bash
python run.py
```

You should see output like:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

## Step 3: Open the Dashboard

Open your web browser and go to:
**http://localhost:8000/**

You should see the beautiful dashboard with:
- 📊 Real-time statistics
- 📈 Interactive charts
- 📋 Attendance tables
- 🌙 Late stay monitoring
- 📊 Project work balance reports

## Step 4: Explore the API

Visit the interactive API documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Features Available

✅ **Attendance Tracking**
- View daily attendance records
- Check individual employee summaries
- See late arrivals and work hours

✅ **Late Stay Monitoring**
- Track employees staying after 8:00 PM
- Special monitoring for women employees (safety compliance)
- Real-time late stay alerts

✅ **Reports & Analytics**
- Work balance by project
- WFO compliance tracking
- Well-being recommendations

✅ **Beautiful Dashboard**
- Modern, responsive design
- Interactive charts and visualizations
- Real-time data updates

## Troubleshooting

**Port 8000 already in use?**
```bash
# Change port in run.py or use:
uvicorn backend.main:app --reload --port 8001
```

**Can't see the dashboard?**
- Make sure the server is running
- Check browser console for errors
- Verify `frontend/dashboard/` folder exists

**API not working?**
- Check that `data/` folder contains JSON files
- Verify API endpoints at http://localhost:8000/docs

## Next Steps

1. Customize the data in `data/` folder
2. Integrate with your face recognition system
3. Connect to a database
4. Add authentication
5. Deploy to production

Enjoy your Attendance & Late-Stay Copilot! 🎉

