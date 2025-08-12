# AI Engineer

An advanced AI coding assistant with a modern UI, file management capabilities, and integrated terminal.

## Features

- Multi-AI provider support (OpenAI, Anthropic, Gemini, DeepSeek)
- Real-time code editing with syntax highlighting
- File explorer for project management
- Integrated terminal for command execution
- AI chat interface for coding assistance
- Dark/light mode support

## Setup Instructions

### Prerequisites

- Python 3.8+ for the backend
- Node.js 16+ for the frontend
- OpenAI API key (or other supported AI provider keys)

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment (optional but recommended):
   ```
   python -m venv venv
   venv\Scripts\activate  # On Windows
   source venv/bin/activate  # On macOS/Linux
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Configure your environment variables by copying the example file:
   ```
   copy .env.example .env
   ```

5. Edit the `.env` file and add your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key (optional)
   GEMINI_API_KEY=your_gemini_api_key (optional)
   DEEPSEEK_API_KEY=your_deepseek_api_key (optional)
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Running the Application

### Option 1: Using the start script (Windows)

Run the `start.bat` file in the root directory to launch both the backend and frontend servers.

### Option 2: Manual startup

1. Start the backend server:
   ```
   cd backend
   python server.py
   ```

2. In a separate terminal, start the frontend development server:
   ```
   cd frontend
   npm start
   ```

3. Access the application at http://localhost:3000

## Quick Demo

If you just want to see a preview of the UI without setting up the full application, you can run:

```
python serve-preview.py
```

This will serve a static HTML preview at http://localhost:8080

## Troubleshooting

- If you encounter errors with the backend server, check that your API keys are correctly set in the `.env` file.
- If the frontend fails to connect to the backend, ensure the backend server is running and accessible at http://localhost:8001.
- For package installation issues, make sure you're using compatible versions of Python and Node.js.

## License

MIT