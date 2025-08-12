import http.server
import socketserver
import os
import sys
from pathlib import Path

PORT = 8091  # Changed port to avoid conflicts
HTML_FILE = "cline-ai-preview.html"

class SimpleHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Handle root path
        if self.path == '/':
            self.path = f'/{HTML_FILE}'
        
        # Handle Vite client requests (404 in logs)
        elif self.path == '/@vite/client':
            self.send_response(200)
            self.send_header('Content-type', 'application/javascript')
            self.end_headers()
            self.wfile.write(b'// Empty Vite client mock to prevent 404 errors')
            return
        
        # Handle favicon requests
        elif self.path == '/favicon.ico':
            self.send_response(200)
            self.send_header('Content-type', 'image/x-icon')
            self.end_headers()
            # Send an empty response to prevent 404
            return
            
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

def main():
    # Check if the HTML file exists
    if not Path(HTML_FILE).exists():
        print(f"Error: {HTML_FILE} not found in the current directory.")
        print(f"Current directory: {os.getcwd()}")
        sys.exit(1)
        
    # Start the server
    try:
        with socketserver.TCPServer(("", PORT), SimpleHTTPRequestHandler) as httpd:
            print(f"\nPreview server started at http://localhost:{PORT}")
            print(f"Open your browser and navigate to http://localhost:{PORT}")
            print("Press Ctrl+C to stop the server\n")
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nServer stopped.")
    except OSError as e:
        print(f"Error starting server: {e}")
        print("The port may be in use. Try changing the PORT value in the script.")
        sys.exit(1)

if __name__ == "__main__":
    main()