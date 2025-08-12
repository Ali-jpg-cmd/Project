import os
import json
import asyncio
import logging
import subprocess
import tempfile
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import uuid

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

# AI Provider imports
import openai
try:
    import anthropic
except ImportError:
    anthropic = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Engineer Backend", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
active_sessions = {}
conversation_history = {}
api_keys = {
    "openai": os.getenv("OPENAI_API_KEY"),
    "anthropic": os.getenv("ANTHROPIC_API_KEY"),
    "gemini": os.getenv("GEMINI_API_KEY"),
    "emergent": "eme_sk_test_key_12345"  # Built-in key for demo
}

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    model: str = "gpt-4o"
    provider: str = "openai"
    session_id: str
    context: Optional[Dict] = None
    temperature: float = 0.7
    max_tokens: int = 2000

class FileOperation(BaseModel):
    operation: str  # read, write, create, delete, list
    path: str
    content: Optional[str] = None
    recursive: bool = False

class CommandExecution(BaseModel):
    command: str
    session_id: str
    working_directory: Optional[str] = None

class APIKeyRequest(BaseModel):
    provider: str
    api_key: str
    is_active: bool = True

class TestAPIKeyRequest(BaseModel):
    provider: str
    model: str
    test_message: str = "Hello! This is a test message."

class ProjectAnalysis(BaseModel):
    project_path: str
    analysis_type: str = "full"  # full, security, performance, structure

class CodeGeneration(BaseModel):
    prompt: str
    language: str = "python"
    framework: Optional[str] = None
    style: str = "clean"  # clean, minimal, verbose

# AI Provider configurations
MODELS = {
    "openai": [
        "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"
    ],
    "anthropic": [
        "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", 
        "claude-3-opus-20240229", "claude-3-sonnet-20240229"
    ],
    "gemini": [
        "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"
    ],
    "emergent": [
        "gpt-4o", "claude-3-5-sonnet-20241022", "gemini-2.0-flash"
    ]
}

# Dangerous commands to block
DANGEROUS_COMMANDS = [
    "rm -rf /", "sudo rm", "format", "del /f", "rmdir /s",
    "shutdown", "reboot", "halt", "poweroff", "init 0",
    "dd if=", "mkfs", "fdisk", "parted", "wipefs"
]

@app.get("/")
async def root():
    return {
        "message": "AI Engineer Backend API",
        "version": "2.0.0",
        "status": "running",
        "features": [
            "Multi-AI Chat Support",
            "Advanced File Operations",
            "Terminal Integration",
            "Project Analysis",
            "Code Generation",
            "Real-time Collaboration"
        ]
    }

@app.get("/api/models")
async def get_models():
    """Get available AI models for each provider"""
    return MODELS

@app.get("/api/api-keys")
async def get_api_keys():
    """Get masked API keys"""
    masked_keys = []
    for provider, key in api_keys.items():
        if key:
            masked_key = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "***"
            masked_keys.append({
                "provider": provider,
                "api_key_masked": masked_key,
                "is_active": True
            })
    return {"keys": masked_keys}

@app.post("/api/api-keys")
async def add_api_key(request: APIKeyRequest):
    """Add or update API key"""
    try:
        api_keys[request.provider] = request.api_key
        logger.info(f"API key updated for provider: {request.provider}")
        return {"success": True, "message": f"API key for {request.provider} updated successfully"}
    except Exception as e:
        logger.error(f"Error updating API key: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/api-keys/{provider}")
async def delete_api_key(provider: str):
    """Delete API key"""
    if provider in api_keys:
        api_keys[provider] = None
        return {"success": True, "message": f"API key for {provider} deleted"}
    else:
        raise HTTPException(status_code=404, detail="Provider not found")

@app.post("/api/test-api-key")
async def test_api_key(request: TestAPIKeyRequest):
    """Test API key functionality"""
    try:
        if request.provider == "emergent":
            # Use built-in key for emergent
            response = await chat_with_ai(
                request.test_message, 
                request.model, 
                request.provider,
                temperature=0.7
            )
            return {
                "success": True,
                "message": "API key test successful",
                "test_response": response[:100] + "..." if len(response) > 100 else response
            }
        else:
            # Test with actual provider
            response = await chat_with_ai(
                request.test_message, 
                request.model, 
                request.provider,
                temperature=0.7
            )
            return {
                "success": True,
                "message": "API key test successful",
                "test_response": response[:100] + "..." if len(response) > 100 else response
            }
    except Exception as e:
        logger.error(f"API key test failed: {str(e)}")
        return {
            "success": False,
            "message": f"API key test failed: {str(e)}"
        }

async def chat_with_ai(message: str, model: str, provider: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
    """Chat with AI providers"""
    try:
        if provider == "openai" or provider == "emergent":
            api_key = api_keys.get("openai") or "sk-test-key-for-demo"
            client = openai.OpenAI(api_key=api_key)
            
            response = client.chat.completions.create(
                model=model if provider == "openai" else "gpt-3.5-turbo",
                messages=[{"role": "user", "content": message}],
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content

        elif provider == "anthropic" and anthropic:
            api_key = api_keys.get("anthropic")
            if not api_key:
                raise Exception("Anthropic API key not configured")
            
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[{"role": "user", "content": message}]
            )
            return response.content[0].text

        elif provider == "gemini" and genai:
            api_key = api_keys.get("gemini")
            if not api_key:
                raise Exception("Gemini API key not configured")
            
            genai.configure(api_key=api_key)
            model_instance = genai.GenerativeModel(model)
            response = model_instance.generate_content(message)
            return response.text

        else:
            raise Exception(f"Provider {provider} not supported or not configured")

    except Exception as e:
        logger.error(f"AI chat error: {str(e)}")
        raise Exception(f"AI chat failed: {str(e)}")

@app.post("/api/chat")
async def chat_endpoint(request: ChatMessage):
    """Enhanced chat endpoint with context awareness"""
    try:
        session_id = request.session_id
        
        # Initialize conversation history for session
        if session_id not in conversation_history:
            conversation_history[session_id] = []
        
        # Add user message to history
        conversation_history[session_id].append({
            "role": "user",
            "content": request.message,
            "timestamp": datetime.now().isoformat()
        })
        
        # Prepare context-aware message
        context_message = request.message
        if request.context:
            context_info = f"Context: {json.dumps(request.context)}\n\nUser message: {request.message}"
            context_message = context_info
        
        # Get AI response
        ai_response = await chat_with_ai(
            context_message,
            request.model,
            request.provider,
            request.temperature,
            request.max_tokens
        )
        
        # Add AI response to history
        conversation_history[session_id].append({
            "role": "assistant",
            "content": ai_response,
            "timestamp": datetime.now().isoformat(),
            "model": request.model,
            "provider": request.provider
        })
        
        return {
            "response": ai_response,
            "session_id": session_id,
            "model": request.model,
            "provider": request.provider
        }
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/conversations/{session_id}")
async def get_conversation_history(session_id: str):
    """Get conversation history for a session"""
    return conversation_history.get(session_id, [])

@app.post("/api/file-operation")
async def file_operation(request: FileOperation):
    """Enhanced file operations with safety checks"""
    try:
        path = Path(request.path)
        
        # Security check - prevent access outside project directory
        if ".." in str(path) or str(path).startswith("/"):
            if not str(path).startswith("/app"):
                raise HTTPException(status_code=403, detail="Access denied")
        
        if request.operation == "read":
            if not path.exists():
                raise HTTPException(status_code=404, detail="File not found")
            
            if path.is_file():
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    return {"success": True, "content": content, "type": "file"}
                except UnicodeDecodeError:
                    # Handle binary files
                    return {"success": True, "content": "[Binary file - cannot display]", "type": "binary"}
            else:
                raise HTTPException(status_code=400, detail="Path is not a file")
        
        elif request.operation == "write":
            if request.content is None:
                raise HTTPException(status_code=400, detail="Content required for write operation")
            
            # Create parent directories if they don't exist
            path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(request.content)
            return {"success": True, "message": f"File {path} written successfully"}
        
        elif request.operation == "create":
            if path.exists():
                raise HTTPException(status_code=409, detail="File already exists")
            
            path.parent.mkdir(parents=True, exist_ok=True)
            
            if request.content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(request.content)
            else:
                path.touch()
            
            return {"success": True, "message": f"File {path} created successfully"}
        
        elif request.operation == "delete":
            if not path.exists():
                raise HTTPException(status_code=404, detail="File not found")
            
            if path.is_file():
                path.unlink()
            else:
                shutil.rmtree(path)
            
            return {"success": True, "message": f"File {path} deleted successfully"}
        
        elif request.operation == "list":
            if not path.exists():
                raise HTTPException(status_code=404, detail="Path not found")
            
            items = []
            if path.is_dir():
                for item in path.iterdir():
                    if request.recursive and item.is_dir():
                        # Recursively list subdirectories
                        sub_items = []
                        for sub_item in item.rglob("*"):
                            if sub_item.is_file():
                                sub_items.append({
                                    "name": str(sub_item.relative_to(path)),
                                    "type": "file",
                                    "size": sub_item.stat().st_size,
                                    "modified": datetime.fromtimestamp(sub_item.stat().st_mtime).isoformat()
                                })
                        items.extend(sub_items)
                    else:
                        items.append({
                            "name": item.name,
                            "type": "directory" if item.is_dir() else "file",
                            "size": item.stat().st_size if item.is_file() else 0,
                            "modified": datetime.fromtimestamp(item.stat().st_mtime).isoformat()
                        })
            
            return {"success": True, "items": items}
        
        else:
            raise HTTPException(status_code=400, detail="Invalid operation")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File operation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/file-tree")
async def get_file_tree():
    """Get project file tree structure"""
    try:
        def build_tree(path: Path, max_depth: int = 3, current_depth: int = 0):
            if current_depth >= max_depth:
                return None
            
            items = []
            try:
                for item in sorted(path.iterdir()):
                    # Skip hidden files and common ignore patterns
                    if item.name.startswith('.') or item.name in ['node_modules', '__pycache__', 'venv']:
                        continue
                    
                    item_data = {
                        "name": item.name,
                        "path": str(item),
                        "type": "directory" if item.is_dir() else "file"
                    }
                    
                    if item.is_dir():
                        children = build_tree(item, max_depth, current_depth + 1)
                        if children:
                            item_data["children"] = children
                    
                    items.append(item_data)
            except PermissionError:
                pass
            
            return items
        
        tree = build_tree(Path("."))
        return {"success": True, "tree": tree}
    
    except Exception as e:
        logger.error(f"File tree error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/execute-command")
async def execute_command(request: CommandExecution):
    """Enhanced command execution with safety checks"""
    try:
        command = request.command.strip()
        
        # Security check - block dangerous commands
        for dangerous in DANGEROUS_COMMANDS:
            if dangerous in command.lower():
                raise HTTPException(status_code=403, detail=f"Command blocked for security: {dangerous}")
        
        # Set working directory
        working_dir = request.working_directory or os.getcwd()
        
        # Execute command
        process = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            cwd=working_dir,
            timeout=30  # 30 second timeout
        )
        
        return {
            "success": process.returncode == 0,
            "stdout": process.stdout,
            "stderr": process.stderr,
            "return_code": process.returncode,
            "command": command
        }
    
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Command execution timed out")
    except Exception as e:
        logger.error(f"Command execution error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-project")
async def analyze_project(request: ProjectAnalysis):
    """Advanced project analysis"""
    try:
        project_path = Path(request.project_path)
        if not project_path.exists():
            raise HTTPException(status_code=404, detail="Project path not found")
        
        analysis = {
            "project_path": str(project_path),
            "analysis_type": request.analysis_type,
            "timestamp": datetime.now().isoformat(),
            "structure": {},
            "technologies": [],
            "metrics": {},
            "recommendations": []
        }
        
        # Analyze project structure
        file_counts = {"total": 0, "by_extension": {}}
        technologies = set()
        
        for file_path in project_path.rglob("*"):
            if file_path.is_file():
                file_counts["total"] += 1
                ext = file_path.suffix.lower()
                file_counts["by_extension"][ext] = file_counts["by_extension"].get(ext, 0) + 1
                
                # Detect technologies
                if ext in ['.js', '.jsx']:
                    technologies.add('JavaScript/React')
                elif ext in ['.py']:
                    technologies.add('Python')
                elif ext in ['.ts', '.tsx']:
                    technologies.add('TypeScript')
                elif ext in ['.css', '.scss']:
                    technologies.add('CSS/Styling')
                elif file_path.name in ['package.json', 'yarn.lock']:
                    technologies.add('Node.js')
                elif file_path.name in ['requirements.txt', 'setup.py']:
                    technologies.add('Python')
        
        analysis["structure"] = file_counts
        analysis["technologies"] = list(technologies)
        
        # Add recommendations based on analysis
        recommendations = []
        if '.js' in file_counts["by_extension"] and file_counts["by_extension"]['.js'] > 10:
            recommendations.append("Consider migrating to TypeScript for better type safety")
        
        if 'package.json' in [f.name for f in project_path.rglob("package.json")]:
            recommendations.append("Ensure all dependencies are up to date")
        
        analysis["recommendations"] = recommendations
        
        return analysis
    
    except Exception as e:
        logger.error(f"Project analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-code")
async def generate_code(request: CodeGeneration):
    """AI-powered code generation"""
    try:
        # Enhanced prompt for code generation
        enhanced_prompt = f"""
        Generate {request.language} code for the following request:
        {request.prompt}
        
        Requirements:
        - Language: {request.language}
        - Framework: {request.framework or 'None specified'}
        - Style: {request.style}
        - Include proper error handling
        - Add helpful comments
        - Follow best practices
        
        Please provide clean, production-ready code.
        """
        
        # Use OpenAI for code generation
        response = await chat_with_ai(
            enhanced_prompt,
            "gpt-4o",
            "openai",
            temperature=0.3  # Lower temperature for more consistent code
        )
        
        return {
            "success": True,
            "generated_code": response,
            "language": request.language,
            "framework": request.framework,
            "prompt": request.prompt
        }
    
    except Exception as e:
        logger.error(f"Code generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/api/terminal")
async def terminal_websocket(websocket: WebSocket):
    """WebSocket endpoint for terminal interaction"""
    await websocket.accept()
    session_id = str(uuid.uuid4())
    active_sessions[session_id] = websocket
    
    try:
        await websocket.send_text(json.dumps({
            "type": "connection",
            "message": "Terminal session started",
            "session_id": session_id
        }))
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "command":
                command = message.get("command", "")
                
                # Execute command safely
                try:
                    # Security check
                    for dangerous in DANGEROUS_COMMANDS:
                        if dangerous in command.lower():
                            await websocket.send_text(json.dumps({
                                "type": "error",
                                "output": f"Command blocked for security: {dangerous}\n"
                            }))
                            continue
                    
                    # Execute command
                    process = subprocess.run(
                        command,
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=30
                    )
                    
                    output = process.stdout + process.stderr
                    await websocket.send_text(json.dumps({
                        "type": "output",
                        "output": output,
                        "return_code": process.returncode
                    }))
                
                except subprocess.TimeoutExpired:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "output": "Command timed out\n"
                    }))
                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "output": f"Error: {str(e)}\n"
                    }))
    
    except WebSocketDisconnect:
        if session_id in active_sessions:
            del active_sessions[session_id]
    except Exception as e:
        logger.error(f"Terminal WebSocket error: {str(e)}")
        if session_id in active_sessions:
            del active_sessions[session_id]

@app.post("/api/upload-file")
async def upload_file(file: UploadFile = File(...), path: str = ""):
    """Upload file to project"""
    try:
        upload_path = Path(path) / file.filename if path else Path(file.filename)
        
        # Security check
        if ".." in str(upload_path):
            raise HTTPException(status_code=403, detail="Invalid file path")
        
        # Create directory if it doesn't exist
        upload_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save file
        with open(upload_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        return {
            "success": True,
            "message": f"File {file.filename} uploaded successfully",
            "path": str(upload_path),
            "size": len(content)
        }
    
    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "active_sessions": len(active_sessions),
        "providers": {
            "openai": bool(api_keys.get("openai")),
            "anthropic": bool(api_keys.get("anthropic")),
            "gemini": bool(api_keys.get("gemini")),
            "emergent": True
        }
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )