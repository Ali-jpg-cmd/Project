import requests
import sys
import json

def test_backend(base_url="http://localhost:8001"):
    print("Testing AI Engineer Backend...")
    print(f"Base URL: {base_url}")
    print("=" * 50)
    
    # Test root endpoint
    try:
        print("\nTesting root endpoint...")
        response = requests.get(f"{base_url}/")
        if response.status_code == 200:
            print("✅ Root endpoint is working!")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Root endpoint failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Error connecting to root endpoint: {str(e)}")
    
    # Test models endpoint
    try:
        print("\nTesting models endpoint...")
        response = requests.get(f"{base_url}/api/models")
        if response.status_code == 200:
            print("✅ Models endpoint is working!")
            print(f"Available models: {json.dumps(response.json(), indent=2)[:200]}...")
        else:
            print(f"❌ Models endpoint failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Error connecting to models endpoint: {str(e)}")
    
    print("\nBackend test completed!")

if __name__ == "__main__":
    # Use custom base URL if provided as command line argument
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001"
    test_backend(base_url)