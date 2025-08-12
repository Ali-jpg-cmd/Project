#!/bin/bash

# 🚀 ALI AI ENGINEER - ADVANCED FUTURISTIC LAUNCHER

echo "🎉 ALI AI ENGINEER - ADVANCED FUTURISTIC"
echo "===================================="
echo ""
echo "Choose your experience:"
echo ""
echo "1. 🌐 HTML Preview (Quick Demo)"
echo "   - Instant access, no setup required"
echo "   - Beautiful UI showcase"
echo "   - Perfect for demonstrations"
echo ""
echo "2. ⚛️ Full React App (Complete Features)"
echo "   - Real AI integration"
echo "   - Working file operations"
echo "   - Live terminal execution"
echo ""
echo "3. 📖 View Documentation"
echo ""
echo "4. 🛑 Exit"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🌐 Starting HTML Preview Server..."
        echo "📱 URL: http://localhost:8080"
        echo "🛑 Press Ctrl+C to stop"
        echo ""
        cd /app
        python3 serve-preview.py
        ;;
    2)
        echo ""
        echo "⚛️ Starting Full React Application..."
        echo "🔧 Starting services..."
        sudo supervisorctl restart all
        
        echo "✅ Services started!"
        echo ""
        echo "📱 Frontend URL: http://localhost:3000"
        echo "🔧 Backend API: http://localhost:8001"
        echo ""
        echo "🎯 Features available:"
        echo "  ✅ Multi-AI Chat (OpenAI, Anthropic, Gemini, Emergent)"
        echo "  ✅ Real file management and editing"
        echo "  ✅ Working terminal execution"
        echo "  ✅ Professional code editor"
        echo ""
        echo "🌐 Open http://localhost:3000 in your browser"
        read -p "Press Enter to continue..."
        ;;
    3)
        echo ""
        echo "📖 Opening documentation..."
        if command -v less &> /dev/null; then
            less /app/README-PREVIEW.md
        else
            cat /app/README-PREVIEW.md
        fi
        ;;
    4)
        echo ""
        echo "👋 Thank you for trying Ali AI Engineer - Advanced Futuristic!"
        echo "🚀 Built with ❤️ for the future of AI-powered development"
        exit 0
        ;;
    *)
        echo ""
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac