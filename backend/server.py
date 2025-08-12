from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, Union, Tuple
import json
import asyncio
import subprocess
import shutil
import glob
from pathlib import Path
import sys
import openai
import re
import logging
from contextlib import asynccontextmanager

# Load environment variables
load_dotenv()

# Configuration class
class Settings:
    PROJECT_NAME: str = "ALI AI Engineer"
    PROJECT_VERSION: str = "2.0.0"
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    EMERGENT_API_KEY: Optional[str] = os.getenv("EMERGENT_API_KEY")
    DEEPSEEK_API_KEY: Optional[str] = os.getenv("DEEPSEEK_API_KEY")
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "deepseek-coder") if os.getenv("DEEPSEEK_API_KEY") else "gpt-4o"
    MAX_HISTORY_LENGTH: int = 100
    ENABLE_STREAMING: bool = True
    DEBUG_MODE: bool = os.getenv("DEBUG_MODE", "False").lower() == "true"

settings = Settings()

# Configure OpenAI client
if settings.OPENAI_API_KEY:
    openai.api_key = settings.OPENAI_API_KEY

# Application lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load models, establish connections, etc.
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.PROJECT_VERSION}")
    
    # Check for API keys
    if not settings.OPENAI_API_KEY:
        logger.warning("OpenAI API key not found. Some features may be limited.")
    
    yield
    
    # Shutdown: Clean up resources
    logger.info(f"Shutting down {settings.PROJECT_NAME}")

# Create FastAPI app with lifespan
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Advanced AI Engineer for coding, debugging and building projects",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for chat history and active sessions
chat_history = {}
active_sessions = {}

class CommandProcessor:
    """Process commands from AI responses to perform file operations and coding tasks"""
    
    @staticmethod
    def extract_commands(response: str) -> List[Dict[str, Any]]:
        """Extract commands from AI response"""
        commands = []
        
        # Pattern to match commands in the format: {{command:operation|path|content}}
        command_pattern = r'\{\{command:(\w+)\|(.*?)(?:\|(.+?))?\}\}'
        matches = re.finditer(command_pattern, response, re.DOTALL)
        
        for match in matches:
            operation = match.group(1)
            path = match.group(2)
            content = match.group(3) if len(match.groups()) > 2 else None
            
            commands.append({
                "operation": operation,
                "path": path,
                "content": content,
                "full_match": match.group(0)
            })
        
        return commands
    
    @staticmethod
    async def process_commands(commands: List[Dict[str, Any]]) -> Tuple[str, List[Dict[str, Any]]]:
        """Process extracted commands and return updated response and results"""
        results = []
        response_text = ""
        
        for cmd in commands:
            operation = cmd["operation"]
            path = cmd["path"]
            content = cmd["content"]
            full_match = cmd["full_match"]
            
            result = {
                "operation": operation,
                "path": path,
                "success": False,
                "message": ""
            }
            
            try:
                # Handle different operations
                if operation == "read":
                    if os.path.exists(path):
                        with open(path, 'r', encoding='utf-8') as file:
                            file_content = file.read()
                        result["success"] = True
                        result["content"] = file_content
                        result["message"] = f"Successfully read file: {path}"
                    else:
                        result["message"] = f"File not found: {path}"
                
                elif operation == "write" or operation == "create":
                    if not content:
                        result["message"] = "No content provided for write operation"
                    else:
                        # Create directory if it doesn't exist
                        os.makedirs(os.path.dirname(path), exist_ok=True)
                        
                        with open(path, 'w', encoding='utf-8') as file:
                            file.write(content)
                        result["success"] = True
                        result["message"] = f"Successfully wrote to file: {path}"
                
                elif operation == "append":
                    if not content:
                        result["message"] = "No content provided for append operation"
                    else:
                        # Create directory if it doesn't exist
                        os.makedirs(os.path.dirname(path), exist_ok=True)
                        
                        # Create file if it doesn't exist
                        if not os.path.exists(path):
                            with open(path, 'w', encoding='utf-8') as file:
                                file.write(content)
                        else:
                            with open(path, 'a', encoding='utf-8') as file:
                                file.write(content)
                        result["success"] = True
                        result["message"] = f"Successfully appended to file: {path}"
                
                elif operation == "delete":
                    if os.path.exists(path):
                        if os.path.isdir(path):
                            shutil.rmtree(path)
                        else:
                            os.remove(path)
                        result["success"] = True
                        result["message"] = f"Successfully deleted: {path}"
                    else:
                        result["message"] = f"Path not found: {path}"
                
                elif operation == "list":
                    if os.path.exists(path) and os.path.isdir(path):
                        items = []
                        for item in os.listdir(path):
                            item_path = os.path.join(path, item)
                            items.append({
                                "name": item,
                                "is_directory": os.path.isdir(item_path),
                                "size": os.path.getsize(item_path) if os.path.isfile(item_path) else 0
                            })
                        result["success"] = True
                        result["items"] = items
                        result["message"] = f"Successfully listed directory: {path}"
                    else:
                        result["message"] = f"Directory not found: {path}"
                
                elif operation == "run":
                    if not content:
                        result["message"] = "No command provided for run operation"
                    else:
                        # Execute the command
                        process = await asyncio.create_subprocess_shell(
                            content,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE,
                            cwd=path if os.path.isdir(path) else os.path.dirname(path)
                        )
                        stdout, stderr = await process.communicate()
                        
                        result["success"] = process.returncode == 0
                        result["stdout"] = stdout.decode('utf-8')
                        result["stderr"] = stderr.decode('utf-8')
                        result["returncode"] = process.returncode
                        result["message"] = "Command executed successfully" if process.returncode == 0 else "Command execution failed"
                
                else:
                    result["message"] = f"Unsupported operation: {operation}"
            
            except Exception as e:
                result["message"] = f"Error processing command: {str(e)}"
            
            results.append(result)
        
        return response_text, results

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("ali-ai-engineer")

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    model: str = "gpt-4o"
    session_id: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    context: Optional[List[Dict[str, Any]]] = None
    stream: bool = True
    tools: Optional[List[Dict[str, Any]]] = None

class MessageContent(BaseModel):
    type: str  # 'text', 'code', 'image', 'file'
    content: str
    language: Optional[str] = None  # For code blocks
    metadata: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: Union[str, List[MessageContent]]
    session_id: str
    is_active: bool = True
    model: str
    tokens_used: Optional[Dict[str, int]] = None
    thinking_steps: Optional[List[str]] = None
    command_results: Optional[List[Dict[str, Any]]] = None

class APIKeyTest(BaseModel):
    provider: str
    model: str
    test_message: str = "Hello! This is a test message."

class TerminalCommand(BaseModel):
    command: str
    working_directory: Optional[str] = None
    timeout: Optional[int] = 30
    environment_vars: Optional[Dict[str, str]] = None

class FileOperation(BaseModel):
    operation: str  # 'read', 'write', 'list', 'create', 'delete', 'rename', 'search'
    path: str
    content: Optional[str] = None
    new_path: Optional[str] = None  # For rename operations
    pattern: Optional[str] = None  # For search operations
    recursive: bool = False  # For search and list operations

class GitOperation(BaseModel):
    operation: str  # 'clone', 'pull', 'status', 'commit', 'push', etc.
    repository_url: Optional[str] = None
    destination_path: Optional[str] = None
    branch: Optional[str] = None
    commit_message: Optional[str] = None
    files: Optional[List[str]] = None  # For commit operations

class CodeAnalysis(BaseModel):
    operation: str  # 'lint', 'test', 'analyze', 'suggest'
    language: str
    code: str
    file_path: Optional[str] = None

@app.get("/")
def root():
    return {"message": "ALI AI Backend is running!"}

# Helper functions for AI interactions
async def get_ai_response(message: str, history: List[Dict[str, Any]], model: str, system_prompt: Optional[str] = None, temperature: float = 0.7):
    """Get response from AI model based on message and history"""
    try:
        # Default system prompt for coding assistant if not provided
        if not system_prompt:
            system_prompt = (
                "You are ALI (Advanced Language Intelligence), an expert AI coding assistant. "
                "You excel at helping with programming tasks, explaining concepts, debugging code, "
                "and suggesting improvements. You provide clear, concise, and accurate responses "
                "with well-formatted code examples when appropriate. You can analyze code, suggest "
                "optimizations, and help design software architecture. Always prioritize best "
                "practices, readability, and security in your suggestions.\n\n"
                "You can perform file operations and execute commands using special command syntax. "
                "To perform these operations, use the following format in your response:\n"
                "{{command:operation|path|content}}\n\n"
                "Available operations:\n"
                "- read: Read file content. Example: {{command:read|/path/to/file}}\n"
                "- write: Write content to a file. Example: {{command:write|/path/to/file|file content}}\n"
                "- create: Create a new file. Example: {{command:create|/path/to/file|file content}}\n"
                "- append: Append content to a file. Example: {{command:append|/path/to/file|content to append}}\n"
                "- delete: Delete a file or directory. Example: {{command:delete|/path/to/file}}\n"
                "- list: List directory contents. Example: {{command:list|/path/to/directory}}\n"
                "- run: Execute a shell command. Example: {{command:run|/working/directory|command to run}}\n\n"
                "When a user asks you to create or modify files, use these commands instead of just showing code blocks."
            )
        
        # Format conversation history for the AI model
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add conversation history (limited to last 10 messages for context)
        for msg in history[-10:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Add the current user message
        messages.append({"role": "user", "content": message})
        
        # Select the appropriate AI provider based on the model
        if model.startswith("gpt-"):
            # Use OpenAI
            if not settings.OPENAI_API_KEY:
                raise ValueError("OpenAI API key not found in environment variables")
            
            response = await openai.ChatCompletion.acreate(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=2048
            )
            
            ai_response = response.choices[0].message.content
            tokens_used = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        
        elif model.startswith("deepseek-"):
            # Use DeepSeek API
            if not settings.DEEPSEEK_API_KEY:
                raise ValueError("DeepSeek API key not found in environment variables")
            
            import requests
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}"
            }
            
            # Convert our message format to DeepSeek format
            deepseek_messages = []
            for msg in messages:
                deepseek_messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
            
            payload = {
                "model": model,
                "messages": deepseek_messages,
                "temperature": temperature,
                "max_tokens": 2048
            }
            
            response = requests.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers=headers,
                json=payload
            )
            
            response_data = response.json()
            
            if response.status_code != 200:
                logger.error(f"DeepSeek API error: {response_data}")
                raise ValueError(f"DeepSeek API error: {response_data.get('error', {}).get('message', 'Unknown error')}")
            
            ai_response = response_data["choices"][0]["message"]["content"]
            tokens_used = {
                "prompt_tokens": response_data["usage"]["prompt_tokens"],
                "completion_tokens": response_data["usage"]["completion_tokens"],
                "total_tokens": response_data["usage"]["total_tokens"]
            }
            
        # Add support for other AI providers here (Anthropic, Gemini, etc.)
        else:
            # Fallback to mock response for unsupported models
            logger.warning(f"Model {model} not supported, using mock response")
            ai_response = generate_mock_response(message)
            tokens_used = {"total_tokens": len(message.split()) + len(ai_response.split())}
        
        return ai_response, tokens_used
        
    except Exception as e:
        logger.error(f"Error getting AI response: {str(e)}")
        raise

def generate_mock_response(message: str) -> str:
    """Generate a mock response for demonstration purposes"""
    message_lower = message.lower()
    
    if any(keyword in message_lower for keyword in ["code", "function", "programming", "implement"]):
        return "Here's a simple Python function example:\n\n```python\ndef greet(name):\n    return f'Hello, {name}! Welcome to programming.'\n\n# Example usage\nresult = greet('Developer')\nprint(result)  # Outputs: Hello, Developer! Welcome to programming.\n```\n\nThis function takes a name parameter and returns a greeting message. Is there a specific type of function you'd like help with?"
    
    elif any(keyword in message_lower for keyword in ["explain", "how", "what is", "concept"]):
        return "I'd be happy to explain that concept. What specific aspect would you like me to elaborate on? I can provide code examples, step-by-step explanations, or best practices depending on your needs."
    
    elif any(keyword in message_lower for keyword in ["debug", "error", "fix", "issue", "problem"]):
        return "I can help you debug that issue. To provide the most effective assistance, could you share:\n\n1. The relevant code snippet\n2. Any error messages you're seeing\n3. What you've already tried\n\nWith this information, I can help identify the root cause and suggest solutions."
    
    else:
        return "I'm ALI, your AI coding assistant. I can help you with programming tasks, explain concepts, debug code, or suggest improvements. How can I assist you with your development work today?"

@app.post("/api/chat")
async def chat_with_ai(request: ChatMessage, background_tasks: BackgroundTasks):
    try:
        # Generate a session ID if not provided
        session_id = request.session_id or str(uuid.uuid4())
        
        # Store the message in chat history
        if session_id not in chat_history:
            chat_history[session_id] = []
            active_sessions[session_id] = {
                "created_at": datetime.utcnow().isoformat(),
                "last_activity": datetime.utcnow().isoformat(),
                "model": request.model,
                "message_count": 0
            }
        
        # Update session activity
        active_sessions[session_id]["last_activity"] = datetime.utcnow().isoformat()
        active_sessions[session_id]["message_count"] += 1
        
        # Add user message to history
        chat_history[session_id].append({
            "role": "user",
            "content": request.message,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Get AI response
        try:
            response, tokens_used = await get_ai_response(
                message=request.message,
                history=chat_history[session_id],
                model=request.model,
                system_prompt=request.system_prompt,
                temperature=request.temperature
            )
        except ValueError as e:
            if "API key not found" in str(e):
                # Fallback to mock response if API key is missing
                logger.warning("API key missing, using mock response")
                response = generate_mock_response(request.message)
                tokens_used = {"total_tokens": len(request.message.split()) + len(response.split())}
            else:
                raise
        
        # Extract and process commands from the AI response
        command_results = []
        commands = CommandProcessor.extract_commands(response)
        
        if commands:
            logger.info(f"Extracted {len(commands)} commands from AI response")
            _, command_results = await CommandProcessor.process_commands(commands)
            
            # Replace command placeholders with results
            for cmd, result in zip(commands, command_results):
                if result["success"]:
                    # For read operations, include the file content
                    if cmd["operation"] == "read" and "content" in result:
                        replacement = f"```\n{result['content']}\n```"
                    else:
                        replacement = f"✅ {result['message']}"
                else:
                    replacement = f"❌ {result['message']}"
                
                response = response.replace(cmd["full_match"], replacement)
        
        # Process the response to extract code blocks, links, etc.
        processed_response = []
        
        # Simple regex to detect code blocks with language
        code_blocks = re.findall(r'```([a-zA-Z0-9_+-]*)(\n[\s\S]*?\n)```', response)
        
        if code_blocks:
            # Split by code blocks and process each part
            parts = re.split(r'```[a-zA-Z0-9_+-]*\n[\s\S]*?\n```', response)
            
            for i, part in enumerate(parts):
                if part.strip():
                    processed_response.append(MessageContent(
                        type="text",
                        content=part.strip()
                    ))
                
                if i < len(code_blocks):
                    language, code = code_blocks[i]
                    processed_response.append(MessageContent(
                        type="code",
                        content=code.strip(),
                        language=language or "plaintext"
                    ))
        else:
            # No code blocks, just text
            processed_response.append(MessageContent(
                type="text",
                content=response
            ))
        
        # Add AI response to history
        chat_history[session_id].append({
            "role": "assistant",
            "content": response,
            "timestamp": datetime.utcnow().isoformat(),
            "command_results": command_results if command_results else None
        })
        
        # Limit history length to prevent memory issues
        if len(chat_history[session_id]) > settings.MAX_HISTORY_LENGTH:
            chat_history[session_id] = chat_history[session_id][-settings.MAX_HISTORY_LENGTH:]
        
        # Schedule cleanup of old sessions
        background_tasks.add_task(cleanup_old_sessions)
        
        return ChatResponse(
            response=processed_response if len(processed_response) > 1 else response,
            session_id=session_id,
            model=request.model,
            tokens_used=tokens_used,
            command_results=command_results if command_results else None
        )
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def cleanup_old_sessions():
    """Remove inactive sessions older than 24 hours"""
    try:
        current_time = datetime.utcnow()
        sessions_to_remove = []
        
        for session_id, session_data in active_sessions.items():
            last_activity = datetime.fromisoformat(session_data["last_activity"])
            hours_since_activity = (current_time - last_activity).total_seconds() / 3600
            
            if hours_since_activity > 24:  # 24 hours of inactivity
                sessions_to_remove.append(session_id)
        
        # Remove old sessions
        for session_id in sessions_to_remove:
            if session_id in active_sessions:
                del active_sessions[session_id]
            if session_id in chat_history:
                del chat_history[session_id]
                
        if sessions_to_remove:
            logger.info(f"Cleaned up {len(sessions_to_remove)} inactive sessions")
    
    except Exception as e:
        logger.error(f"Error cleaning up sessions: {str(e)}")


@app.get("/api/history/{session_id}")
def get_chat_history(session_id: str):
    """Get chat history for a session"""
    if session_id not in chat_history:
        return {"history": []}
    
    return {"history": chat_history[session_id]}
        
        
        

@app.get("/api/models")
def get_available_models():
    models = {
        "openai": [],
        "anthropic": [],
        "gemini": [],
        "emergent": [],
        "deepseek": [],
        "recommended": []
    }
    
    # Add OpenAI models if API key is available
    if settings.OPENAI_API_KEY:
        models["openai"] = [
            "gpt-4o", 
            "gpt-4o-mini", 
            "gpt-4", 
            "gpt-3.5-turbo"
        ]
        models["recommended"].append("gpt-4o")
    
    # Add Anthropic models if API key is available
    if settings.ANTHROPIC_API_KEY:
        models["anthropic"] = [
            "claude-3-opus", 
            "claude-3-sonnet", 
            "claude-3-haiku"
        ]
        models["recommended"].append("claude-3-opus")
    
    # Add Google models if API key is available
    if settings.GEMINI_API_KEY:
        models["gemini"] = [
            "gemini-pro", 
            "gemini-ultra"
        ]
        models["recommended"].append("gemini-ultra")
    
    # Add Emergent models if API key is available
    if settings.EMERGENT_API_KEY:
        models["emergent"] = [
            "emergent-coder-v1", 
            "emergent-coder-v2"
        ]
        models["recommended"].append("emergent-coder-v2")
    
    # Add DeepSeek models if API key is available
    if settings.DEEPSEEK_API_KEY:
        models["deepseek"] = [
            "deepseek-coder",
            "deepseek-chat",
            "deepseek-coder-instruct",
            "deepseek-coder-32b"
        ]
        models["recommended"].append("deepseek-coder")
    
    # If no API keys are available, provide mock models
    if not any(models.values()):
        logger.warning("No API keys found, returning mock models")
        models["mock"] = ["mock-advanced", "mock-standard"]
        models["recommended"] = ["mock-advanced"]
    
    return {"models": models, "default_model": settings.DEFAULT_MODEL}

@app.post("/api/terminal/execute")
def execute_terminal_command(command_request: TerminalCommand):
    try:
        # Set working directory or use current directory
        cwd = command_request.working_directory or os.getcwd()
        
        # Create a safe environment for the command
        env = os.environ.copy()
        
        # Define unsafe commands that should be blocked
        unsafe_commands = [
            'rm -rf', 'format', 'del /s', 'deltree',
            'shutdown', 'reboot', ':(){:|:&};:',
            'chmod -R 777', 'mkfs', 'dd if=/dev/zero',
            'mv /* /dev/null', '> /dev/sda', 'wget', 'curl'
        ]
        
        # Check if command contains unsafe operations
        if any(unsafe_cmd in command_request.command.lower() for unsafe_cmd in unsafe_commands):
            return {
                "success": False,
                "output": "Command rejected for security reasons.",
                "error": "This command contains potentially unsafe operations."
            }
        
        # Execute the command
        if sys.platform == 'win32':
            # Use PowerShell on Windows
            process = subprocess.Popen(
                ['powershell', '-Command', command_request.command],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=cwd,
                env=env
            )
        else:
            # Use bash on Unix-like systems
            process = subprocess.Popen(
                ['bash', '-c', command_request.command],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=cwd,
                env=env
            )
        
        # Get command output with timeout
        stdout, stderr = process.communicate(timeout=30)
        
        return {
            "success": process.returncode == 0,
            "output": stdout,
            "error": stderr,
            "exit_code": process.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "output": "",
            "error": "Command execution timed out after 30 seconds.",
            "exit_code": -1
        }
    except Exception as e:
        return {
            "success": False,
            "output": "",
            "error": str(e),
            "exit_code": -1
        }

@app.post("/api/files/operation")
def file_operation(operation_request: FileOperation):
    try:
        path = operation_request.path
        operation = operation_request.operation.lower()
        
        # Validate path to prevent directory traversal attacks
        if '..' in path or path.startswith('/'):
            return {
                "success": False,
                "error": "Invalid path. Directory traversal is not allowed."
            }
        
        # Handle different file operations
        if operation == 'read':
            if not os.path.exists(path):
                return {"success": False, "error": f"File not found: {path}"}
            
            if os.path.isdir(path):
                return {"success": False, "error": f"{path} is a directory, not a file"}
                
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            return {"success": True, "content": content}
            
        elif operation == 'write':
            if operation_request.content is None:
                return {"success": False, "error": "No content provided for write operation"}
                
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(path), exist_ok=True)
            
            with open(path, 'w', encoding='utf-8') as file:
                file.write(operation_request.content)
            return {"success": True}
            
        elif operation == 'list':
            if not os.path.exists(path):
                return {"success": False, "error": f"Path not found: {path}"}
                
            if not os.path.isdir(path):
                return {"success": False, "error": f"{path} is not a directory"}
                
            items = []
            for item in os.listdir(path):
                item_path = os.path.join(path, item)
                items.append({
                    "name": item,
                    "is_directory": os.path.isdir(item_path),
                    "size": os.path.getsize(item_path) if os.path.isfile(item_path) else 0,
                    "modified": datetime.fromtimestamp(os.path.getmtime(item_path)).isoformat()
                })
            return {"success": True, "items": items}
            
        elif operation == 'create':
            if os.path.exists(path):
                return {"success": False, "error": f"{path} already exists"}
                
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(path), exist_ok=True)
            
            # Create empty file
            with open(path, 'w', encoding='utf-8') as file:
                if operation_request.content:
                    file.write(operation_request.content)
            return {"success": True}
            
        elif operation == 'delete':
            if not os.path.exists(path):
                return {"success": False, "error": f"Path not found: {path}"}
                
            if os.path.isdir(path):
                shutil.rmtree(path)
            else:
                os.remove(path)
            return {"success": True}
            
        elif operation == 'rename':
            if not os.path.exists(path):
                return {"success": False, "error": f"Path not found: {path}"}
                
            if not operation_request.new_path:
                return {"success": False, "error": "New path not provided for rename operation"}
                
            # Create directory for new path if it doesn't exist
            os.makedirs(os.path.dirname(operation_request.new_path), exist_ok=True)
            
            # Rename file or directory
            shutil.move(path, operation_request.new_path)
            return {"success": True}
            
        elif operation == 'search':
            if not operation_request.pattern:
                return {"success": False, "error": "Search pattern is required"}
            
            if not os.path.exists(path):
                return {"success": False, "error": f"Path not found: {path}"}
            
            if not os.path.isdir(path):
                return {"success": False, "error": f"{path} is not a directory"}
            
            results = []
            pattern = operation_request.pattern
            recursive = operation_request.recursive
            
            # Compile regex pattern for content search
            try:
                regex = re.compile(pattern)
            except re.error:
                # If not a valid regex, use as literal string
                regex = re.compile(re.escape(pattern))
            
            # Function to search file content
            def search_file(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                        content = f.read()
                        matches = regex.finditer(content)
                        file_results = []
                        
                        for match in matches:
                            # Get line number and context
                            start_pos = match.start()
                            end_pos = match.end()
                            
                            # Find line number
                            line_num = content[:start_pos].count('\n') + 1
                            
                            # Get line content
                            line_start = content.rfind('\n', 0, start_pos) + 1
                            line_end = content.find('\n', end_pos)
                            if line_end == -1:
                                line_end = len(content)
                            
                            line_content = content[line_start:line_end]
                            
                            file_results.append({
                                "line": line_num,
                                "content": line_content,
                                "match": match.group(0)
                            })
                        
                        if file_results:
                            return {
                                "file": os.path.relpath(file_path, path),
                                "matches": file_results
                            }
                except (UnicodeDecodeError, IOError):
                    # Skip binary files or files with encoding issues
                    pass
                return None
            
            # Walk directory and search files
            if recursive:
                for root, _, files in os.walk(path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        result = search_file(file_path)
                        if result:
                            results.append(result)
            else:
                for item in os.listdir(path):
                    item_path = os.path.join(path, item)
                    if os.path.isfile(item_path):
                        result = search_file(item_path)
                        if result:
                            results.append(result)
            
            return {"success": True, "results": results}
            
        else:
            return {"success": False, "error": f"Unsupported operation: {operation}"}
            
    except Exception as e:
        logger.error(f"Error in file operation: {str(e)}")
        return {"success": False, "error": str(e)}

@app.post("/api/git/operation")
def git_operation(operation_request: GitOperation):
    try:
        operation = operation_request.operation.lower()
        
        # Check if git is installed
        try:
            if sys.platform == 'win32':
                subprocess.run(['where', 'git'], check=True, capture_output=True)
            else:
                subprocess.run(['which', 'git'], check=True, capture_output=True)
        except subprocess.CalledProcessError:
            return {"success": False, "error": "Git is not installed or not in PATH"}
        
        # Handle different git operations
        if operation == 'clone':
            if not operation_request.repository_url:
                return {"success": False, "error": "Repository URL not provided"}
                
            destination = operation_request.destination_path or os.getcwd()
            
            # Create command
            cmd = ['git', 'clone', operation_request.repository_url]
            if operation_request.branch:
                cmd.extend(['--branch', operation_request.branch])
            cmd.append(destination)
            
            # Execute command
            process = subprocess.run(cmd, capture_output=True, text=True)
            
            if process.returncode == 0:
                return {"success": True, "output": process.stdout}
            else:
                return {"success": False, "error": process.stderr}
                
        elif operation in ['pull', 'status', 'fetch']:
            if not operation_request.destination_path:
                return {"success": False, "error": "Destination path not provided"}
                
            if not os.path.exists(operation_request.destination_path):
                return {"success": False, "error": f"Path not found: {operation_request.destination_path}"}
                
            # Execute command
            process = subprocess.run(
                ['git', operation],
                cwd=operation_request.destination_path,
                capture_output=True,
                text=True
            )
            
            if process.returncode == 0:
                return {"success": True, "output": process.stdout}
            else:
                return {"success": False, "error": process.stderr}
        
        elif operation == 'commit':
            if not operation_request.destination_path:
                return {"success": False, "error": "Destination path not provided"}
                
            if not os.path.exists(operation_request.destination_path):
                return {"success": False, "error": f"Path not found: {operation_request.destination_path}"}
                
            if not operation_request.commit_message:
                return {"success": False, "error": "Commit message is required"}
            
            # Add files if specified, otherwise add all changes
            if operation_request.files and len(operation_request.files) > 0:
                for file in operation_request.files:
                    add_result = subprocess.run(
                        ['git', 'add', file],
                        cwd=operation_request.destination_path,
                        capture_output=True,
                        text=True
                    )
                    if add_result.returncode != 0:
                        return {"success": False, "error": f"Failed to add {file}: {add_result.stderr}"}
            else:
                add_result = subprocess.run(
                    ['git', 'add', '.'],
                    cwd=operation_request.destination_path,
                    capture_output=True,
                    text=True
                )
                if add_result.returncode != 0:
                    return {"success": False, "error": f"Failed to add files: {add_result.stderr}"}
            
            # Commit changes
            commit_result = subprocess.run(
                ['git', 'commit', '-m', operation_request.commit_message],
                cwd=operation_request.destination_path,
                capture_output=True,
                text=True
            )
            
            if commit_result.returncode != 0:
                # Check if there were no changes to commit
                if "nothing to commit" in commit_result.stderr or "nothing to commit" in commit_result.stdout:
                    return {"success": False, "error": "Nothing to commit, working tree clean"}
                return {"success": False, "error": commit_result.stderr}
            
            return {"success": True, "output": commit_result.stdout}
        
        elif operation == 'push':
            if not operation_request.destination_path:
                return {"success": False, "error": "Destination path not provided"}
                
            if not os.path.exists(operation_request.destination_path):
                return {"success": False, "error": f"Path not found: {operation_request.destination_path}"}
            
            # Get current branch if not specified
            branch = operation_request.branch
            if not branch:
                branch_result = subprocess.run(
                    ['git', 'branch', '--show-current'],
                    cwd=operation_request.destination_path,
                    capture_output=True,
                    text=True
                )
                if branch_result.returncode == 0:
                    branch = branch_result.stdout.strip()
            
            # Push changes
            push_cmd = ['git', 'push']
            if branch:
                push_cmd.extend(['origin', branch])
                
            push_result = subprocess.run(
                push_cmd,
                cwd=operation_request.destination_path,
                capture_output=True,
                text=True
            )
            
            if push_result.returncode != 0:
                return {"success": False, "error": push_result.stderr}
            
            return {"success": True, "output": push_result.stdout}
                
        else:
            return {"success": False, "error": f"Unsupported git operation: {operation}"}
            
    except Exception as e:
        logger.error(f"Error in git operation: {str(e)}")
        return {"success": False, "error": str(e)}

@app.post("/api/code/analyze")
async def analyze_code(request: CodeAnalysis):
    """Analyze code for issues, suggestions, or improvements"""
    try:
        operation = request.operation.lower()
        language = request.language.lower()
        code = request.code
        file_path = request.file_path
        
        # Initialize response
        result = {
            "success": True,
            "operation": operation,
            "language": language,
            "issues": [],
            "suggestions": [],
            "improved_code": None,
            "explanation": None
        }
        
        # For linting operations
        if operation == "lint":
            # Use AI to analyze code for issues
            prompt = f"""Analyze this {language} code for potential issues, bugs, and style problems:

```{language}
{code}
```

Provide a JSON response with the following structure:
{{
  "issues": [{{"line": <line_number>, "severity": "error|warning|info", "message": "<issue description>", "code": "<issue code>"}}],
  "explanation": "<overall explanation of issues>"
}}
"""
            
            try:
                response = await openai.ChatCompletion.acreate(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are a code analysis expert. Provide detailed, accurate code analysis in JSON format only."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1
                )
                
                # Parse the response
                analysis_text = response.choices[0].message.content
                try:
                    # Extract JSON from the response (in case it's wrapped in markdown)
                    json_match = re.search(r'```json\n(.+?)\n```', analysis_text, re.DOTALL)
                    if json_match:
                        analysis_text = json_match.group(1)
                    
                    analysis = json.loads(analysis_text)
                    result["issues"] = analysis.get("issues", [])
                    result["explanation"] = analysis.get("explanation", "")
                except json.JSONDecodeError:
                    # Fallback to regex parsing if JSON is malformed
                    issues = re.findall(r'"line":\s*(\d+)[^}]+"severity":\s*"([^"]+)"[^}]+"message":\s*"([^"]+)"', analysis_text)
                    result["issues"] = [
                        {"line": int(line), "severity": severity, "message": message}
                        for line, severity, message in issues
                    ]
                    result["explanation"] = "Analysis completed with some parsing issues."
            
            except Exception as e:
                logger.error(f"Error during code linting: {str(e)}")
                result["success"] = False
                result["error"] = str(e)
        
        # For suggestion operations
        elif operation == "suggest":
            prompt = f"""Suggest improvements for this {language} code:

```{language}
{code}
```

Provide a JSON response with the following structure:
{{
  "suggestions": [{{"description": "<suggestion>", "reason": "<reason>"}}],
  "improved_code": "<improved code>",
  "explanation": "<explanation of improvements>"
}}
"""
            
            try:
                response = await openai.ChatCompletion.acreate(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are a code improvement expert. Provide detailed, actionable suggestions to improve code quality, performance, and readability."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3
                )
                
                # Parse the response
                suggestion_text = response.choices[0].message.content
                try:
                    # Extract JSON from the response
                    json_match = re.search(r'```json\n(.+?)\n```', suggestion_text, re.DOTALL)
                    if json_match:
                        suggestion_text = json_match.group(1)
                    
                    suggestions = json.loads(suggestion_text)
                    result["suggestions"] = suggestions.get("suggestions", [])
                    result["improved_code"] = suggestions.get("improved_code", None)
                    result["explanation"] = suggestions.get("explanation", "")
                except json.JSONDecodeError:
                    # Fallback to simple text response
                    result["explanation"] = suggestion_text
            
            except Exception as e:
                logger.error(f"Error during code suggestion: {str(e)}")
                result["success"] = False
                result["error"] = str(e)
        
        # For test generation
        elif operation == "test":
            prompt = f"""Generate unit tests for this {language} code:

```{language}
{code}
```

Provide a JSON response with the following structure:
{{
  "test_code": "<complete test code>",
  "explanation": "<explanation of the tests>",
  "test_cases": [{{"name": "<test name>", "description": "<what this test verifies>"}}]
}}
"""
            
            try:
                response = await openai.ChatCompletion.acreate(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are a testing expert. Generate comprehensive, well-structured unit tests that verify functionality and edge cases."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3
                )
                
                # Parse the response
                test_text = response.choices[0].message.content
                try:
                    # Extract JSON from the response
                    json_match = re.search(r'```json\n(.+?)\n```', test_text, re.DOTALL)
                    if json_match:
                        test_text = json_match.group(1)
                    
                    test_data = json.loads(test_text)
                    result["test_code"] = test_data.get("test_code", "")
                    result["explanation"] = test_data.get("explanation", "")
                    result["test_cases"] = test_data.get("test_cases", [])
                except json.JSONDecodeError:
                    # Extract code block if JSON parsing fails
                    code_match = re.search(r'```[a-zA-Z0-9_+-]*\n([\s\S]*?)\n```', test_text)
                    if code_match:
                        result["test_code"] = code_match.group(1)
                    else:
                        result["test_code"] = test_text
                    result["explanation"] = "Test code generated successfully."
            
            except Exception as e:
                logger.error(f"Error during test generation: {str(e)}")
                result["success"] = False
                result["error"] = str(e)
        
        else:
            return {"success": False, "error": f"Unsupported operation: {operation}"}
        
        return result
    
    except Exception as e:
        logger.error(f"Error in code analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/status")
def get_api_status():
    """Get the status of the API and available services"""
    return {
        "status": "online",
        "version": settings.PROJECT_VERSION,
        "services": {
            "openai": settings.OPENAI_API_KEY is not None,
            "anthropic": settings.ANTHROPIC_API_KEY is not None,
            "gemini": settings.GEMINI_API_KEY is not None,
            "emergent": settings.EMERGENT_API_KEY is not None
        },
        "uptime": "N/A",  # Would require tracking start time
        "memory_usage": "N/A"  # Would require psutil or similar
    }

# Add a main block to run the server
if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting {settings.PROJECT_NAME} server on port 8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)