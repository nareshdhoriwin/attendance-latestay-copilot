"""
Quick test script to verify the server is working
"""
import requests
import time
import sys

def test_server():
    base_url = "http://localhost:8000"
    
    print("Testing server endpoints...")
    print("-" * 50)
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health endpoint: OK")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Health endpoint: Failed with status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running. Please start it with: python run.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Test attendance API
    try:
        response = requests.get(f"{base_url}/api/attendance/records", timeout=5)
        if response.status_code == 200:
            print("✅ Attendance API: OK")
            data = response.json()
            print(f"   Found {len(data.get('attendance_records', []))} attendance records")
        else:
            print(f"❌ Attendance API: Failed with status {response.status_code}")
    except Exception as e:
        print(f"❌ Attendance API Error: {e}")
    
    # Test late stay API
    try:
        response = requests.get(f"{base_url}/api/late-stay/after-8pm", timeout=5)
        if response.status_code == 200:
            print("✅ Late Stay API: OK")
            data = response.json()
            print(f"   Found {data.get('total_count', 0)} late stay employees")
        else:
            print(f"❌ Late Stay API: Failed with status {response.status_code}")
    except Exception as e:
        print(f"❌ Late Stay API Error: {e}")
    
    print("-" * 50)
    print("✅ Server is running! Open http://localhost:8000/ in your browser")
    return True

if __name__ == "__main__":
    print("Waiting for server to start...")
    time.sleep(2)
    test_server()

