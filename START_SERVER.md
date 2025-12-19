# 🚀 How to Start the Server

## Step 1: Install Dependencies (Already Done!)

The dependencies have been successfully installed. You're all set!

## Step 2: Start the Server

Run this command in your terminal:

```powershell
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

Once the server is running, open your web browser and go to:

**http://localhost:8000/**

## Step 4: Test the Server (Optional)

In a new terminal window, you can test if everything is working:

```powershell
python test_server.py
```

## Troubleshooting

### Port Already in Use
If you see an error about port 8000 being in use:
1. Close any other applications using port 8000
2. Or change the port in `run.py`:
   ```python
   uvicorn.run(app, host="0.0.0.0", port=8001)
   ```

### Module Not Found
If you see "ModuleNotFoundError", make sure you installed the dependencies:
```powershell
pip install -r requirements.txt
```

### Server Won't Start
Check for any error messages in the terminal. Common issues:
- Missing data files in `data/` folder
- Python version compatibility (requires Python 3.8+)
- Port conflicts

## What's Next?

1. ✅ Dependencies installed
2. ▶️ Start the server: `python run.py`
3. 🌐 Open dashboard: http://localhost:8000/
4. 📊 Explore the API docs: http://localhost:8000/docs

Enjoy your Attendance & Late-Stay Copilot! 🎉

