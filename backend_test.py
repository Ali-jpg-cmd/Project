import requests
import sys
import json
import uuid
from datetime import datetime

class AIEngineerAPITester:
    def __init__(self, base_url="https://5a19b259-dca0-41d1-a5f5-f75c5030e176.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_id = str(uuid.uuid4())
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response preview: {str(response_data)[:200]}...")
                    return True, response_data
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timed out after {timeout} seconds")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_get_models(self):
        """Test getting available models"""
        success, response = self.run_test("Get Available Models", "GET", "api/models", 200)
        if success:
            # Verify response structure
            expected_providers = ['openai', 'anthropic', 'gemini']
            for provider in expected_providers:
                if provider not in response:
                    print(f"⚠️  Warning: Missing provider {provider} in response")
                else:
                    print(f"   ✓ Found {provider} with {len(response[provider])} models")
        return success

    def test_chat_openai(self):
        """Test chat with OpenAI model"""
        chat_data = {
            "message": "Hello! Can you help me write a simple Python function?",
            "model": "gpt-4o",
            "provider": "openai",
            "session_id": self.session_id
        }
        success, response = self.run_test("Chat with OpenAI", "POST", "api/chat", 200, chat_data, timeout=60)
        if success and 'response' in response:
            print(f"   AI Response: {response['response'][:100]}...")
            return True
        return False

    def test_chat_anthropic(self):
        """Test chat with Anthropic model"""
        chat_data = {
            "message": "What is FastAPI?",
            "model": "claude-3-5-sonnet-20241022",
            "provider": "anthropic",
            "session_id": self.session_id
        }
        success, response = self.run_test("Chat with Anthropic", "POST", "api/chat", 200, chat_data, timeout=60)
        if success and 'response' in response:
            print(f"   AI Response: {response['response'][:100]}...")
            return True
        return False

    def test_chat_gemini(self):
        """Test chat with Gemini model"""
        chat_data = {
            "message": "Explain React hooks briefly",
            "model": "gemini-2.0-flash",
            "provider": "gemini",
            "session_id": self.session_id
        }
        success, response = self.run_test("Chat with Gemini", "POST", "api/chat", 200, chat_data, timeout=60)
        if success and 'response' in response:
            print(f"   AI Response: {response['response'][:100]}...")
            return True
        return False

    def test_execute_command_safe(self):
        """Test executing safe commands"""
        commands = [
            {"command": "echo 'Hello World'", "expected": True},
            {"command": "pwd", "expected": True},
            {"command": "ls -la", "expected": True}
        ]
        
        all_passed = True
        for cmd_data in commands:
            command_data = {
                "command": cmd_data["command"],
                "session_id": self.session_id
            }
            success, response = self.run_test(f"Execute Command: {cmd_data['command']}", "POST", "api/execute-command", 200, command_data)
            if success:
                print(f"   Output: {response.get('stdout', '')[:100]}...")
                print(f"   Success: {response.get('success', False)}")
            else:
                all_passed = False
        
        return all_passed

    def test_execute_command_dangerous(self):
        """Test that dangerous commands are blocked"""
        dangerous_commands = [
            "rm -rf /",
            "sudo rm -rf /tmp",
            "format C:",
            "shutdown now"
        ]
        
        all_passed = True
        for cmd in dangerous_commands:
            command_data = {
                "command": cmd,
                "session_id": self.session_id
            }
            success, response = self.run_test(f"Block Dangerous Command: {cmd}", "POST", "api/execute-command", 403, command_data)
            if not success:
                all_passed = False
        
        return all_passed

    def test_file_operations(self):
        """Test file operations"""
        # Test reading a file that should exist
        read_data = {
            "path": "/app/backend/server.py",
            "operation": "read"
        }
        success, response = self.run_test("Read File", "POST", "api/file-operation", 200, read_data)
        if success:
            print(f"   File content length: {len(response.get('content', ''))}")
        
        # Test reading non-existent file
        read_nonexistent = {
            "path": "/app/nonexistent.txt",
            "operation": "read"
        }
        success_404, _ = self.run_test("Read Non-existent File", "POST", "api/file-operation", 404, read_nonexistent)
        
        return success and success_404

    def test_file_tree(self):
        """Test file tree endpoint"""
        success, response = self.run_test("Get File Tree", "GET", "api/file-tree", 200)
        if success and 'tree' in response:
            print(f"   Found {len(response['tree'])} top-level items")
            return True
        return False

    def test_conversation_history(self):
        """Test getting conversation history"""
        success, response = self.run_test(f"Get Conversation History", "GET", f"api/conversations/{self.session_id}", 200)
        if success:
            print(f"   Found {len(response)} conversations in session")
            return True
        return False

    def test_get_api_keys(self):
        """Test getting API keys"""
        success, response = self.run_test("Get API Keys", "GET", "api/api-keys", 200)
        if success and 'keys' in response:
            print(f"   Found {len(response['keys'])} API keys")
            for key in response['keys']:
                print(f"   - {key['provider']}: {key['api_key_masked']}")
            return True
        return False

    def test_add_api_key(self):
        """Test adding a new API key"""
        test_key_data = {
            "provider": "openai",
            "api_key": "sk-test-key-for-testing-only-12345678901234567890",
            "is_active": True
        }
        success, response = self.run_test("Add API Key", "POST", "api/api-keys", 200, test_key_data)
        if success and response.get('success'):
            print(f"   Successfully added API key for {test_key_data['provider']}")
            return True
        return False

    def test_delete_api_key(self):
        """Test deleting an API key"""
        success, response = self.run_test("Delete API Key", "DELETE", "api/api-keys/openai", 200)
        if success:
            print(f"   Delete result: {response.get('message', 'No message')}")
            return True
        return False

    def test_api_key_test_functionality(self):
        """Test the API key testing functionality"""
        # Test with emergent provider (should work with built-in key)
        test_data = {
            "provider": "emergent",
            "model": "gpt-4o",
            "test_message": "Hello! This is a test message."
        }
        success, response = self.run_test("Test API Key (Emergent)", "POST", "api/test-api-key", 200, test_data, timeout=60)
        if success:
            print(f"   Test result: {response.get('success', False)}")
            print(f"   Message: {response.get('message', 'No message')}")
            if 'test_response' in response:
                print(f"   AI Response: {response['test_response'][:100]}...")
            return True
        return False

def main():
    print("🚀 Starting AI Software Engineer Backend API Tests")
    print("=" * 60)
    
    tester = AIEngineerAPITester()
    
    # Test sequence
    tests = [
        ("Root Endpoint", tester.test_root_endpoint),
        ("Available Models", tester.test_get_models),
        ("Get API Keys", tester.test_get_api_keys),
        ("Test API Key Functionality", tester.test_api_key_test_functionality),
        ("Add API Key", tester.test_add_api_key),
        ("Delete API Key", tester.test_delete_api_key),
        ("File Tree", tester.test_file_tree),
        ("File Operations", tester.test_file_operations),
        ("Safe Commands", tester.test_execute_command_safe),
        ("Dangerous Commands Blocked", tester.test_execute_command_dangerous),
        ("Chat with OpenAI", tester.test_chat_openai),
        ("Chat with Anthropic", tester.test_chat_anthropic),
        ("Chat with Gemini", tester.test_chat_gemini),
        ("Conversation History", tester.test_conversation_history),
    ]
    
    print(f"\n📋 Running {len(tests)} test categories...")
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test category failed with exception: {str(e)}")
    
    # Print final results
    print(f"\n{'='*60}")
    print(f"📊 FINAL RESULTS")
    print(f"{'='*60}")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Backend API tests mostly successful!")
        return 0
    elif success_rate >= 50:
        print("⚠️  Backend API has some issues but core functionality works")
        return 1
    else:
        print("❌ Backend API has significant issues")
        return 2

if __name__ == "__main__":
    sys.exit(main())