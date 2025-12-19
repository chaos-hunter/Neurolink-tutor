import urllib.request
import urllib.error
import json

BASE_URL = 'http://localhost:5000/api'

def make_request(endpoint, data=None):
    url = f"{BASE_URL}/{endpoint}"
    headers = {'Content-Type': 'application/json'}

    if data:
        data_bytes = json.dumps(data).encode('utf-8')
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method='POST')
    else:
        req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        print(f"Request failed: {e}")
        return 500, {}

def test_auth():
    print("Testing Authentication (urllib)...")

    # 1. Register
    username = "testuser_v4"
    password = "password123"
    print(f"Registering {username}...")
    status, res = make_request("register", {"username": username, "password": password})
    print(f"Register Status: {status}")
    print(f"Register Response: {res}")

    if status != 200:
        print("Registration failed!")
        return

    # 2. Login
    print(f"Logging in {username}...")
    status, res = make_request("login", {"username": username, "password": password})
    print(f"Login Status: {status}")
    print(f"Login Response: {res}")

    if status == 200 and res.get("success"):
        print("Login successful!")
    else:
        print("Login failed!")
        return

    # 3. Update Password
    new_password = "newpassword456"
    print(f"Updating password for {username}...")
    status, res = make_request("update-password", {"student_id": username, "password": new_password})
    print(f"Update Password Status: {status}")
    print(f"Update Password Response: {res}")

    # 4. Login with old password (should fail)
    print(f"Logging in with OLD password...")
    status, res = make_request("login", {"username": username, "password": password})
    print(f"Old Password Login Status: {status}")
    if status == 401:
        print("Old password login failed as expected.")
    else:
        print("Old password login SHOULD have failed but didn't!")

    # 5. Login with new password
    print(f"Logging in with NEW password...")
    status, res = make_request("login", {"username": username, "password": new_password})
    print(f"New Password Login Status: {status}")
    if status == 200:
        print("New password login successful!")
    else:
        print("New password login failed!")

if __name__ == "__main__":
    test_auth()
