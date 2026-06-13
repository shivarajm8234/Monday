# Free Cluely - AI Coding Assistant

A desktop AI assistant that helps solve coding problems, answer questions, and provide explanations using Google's Gemini AI. Built with Electron, React, and TypeScript.

## ✨ Features

- **AI-Powered Solutions**: Uses Gemini 2.5 Pro for intelligent problem-solving
- **Screenshot Analysis**: Take screenshots of problems and get AI solutions
- **Multi-Language Support**: Python and C++ code solutions
- **Smart Question Detection**: Automatically identifies coding problems, MCQs, and theoretical questions
- **Markdown Formatting**: Clean, readable output with proper formatting
- **Copy Functionality**: Easy copy buttons for code sections
- **Multi-Screenshot Support**: Process multiple screenshots together
- **Global Shortcuts**: Quick access with keyboard shortcuts
- **Transparent Window**: Modern, non-intrusive interface

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd free-cluely-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file in root directory
   echo "GEMINI_API_KEY=your_actual_api_key_here" > .env
   ```
   
   **Important**: Replace `your_actual_api_key_here` with your real Gemini API key

4. **Start the application**

   **Option A: Single Command (PowerShell)**
   ```powershell
   $env:NODE_ENV="development"; $env:GEMINI_API_KEY="your_actual_api_key_here"; npm run electron:dev
   ```
   
   **Option B: Separate Commands**
   ```bash
   # Terminal 1: Start Vite dev server on port 5180
   npx vite --port 5180
   
   # Terminal 2: Start Electron app
   npm run electron:dev
   ```
   
   **Note**: Replace `your_actual_api_key_here` with your real Gemini API key

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|---------|
| `Ctrl + H` | Take screenshot |
| `Ctrl + Enter` | Process screenshots with AI |
| `Ctrl + R` | Restart application (fresh start) |
| `Ctrl + B` | Show/Hide window |
| `Ctrl + ↑/↓/←/→` | Move window |

## 🔧 Development

### Project Structure

```
free-cluely-main/
├── electron/           # Electron main process
│   ├── LLMHelper.ts   # AI integration (Gemini)
│   ├── ProcessingHelper.ts # Screenshot processing
│   └── shortcuts.ts   # Global keyboard shortcuts
├── src/               # React frontend
│   ├── components/    # UI components
│   └── _pages/       # Main pages (Queue, Solutions)
├── .env              # Environment variables (create this)
└── package.json      # Dependencies and scripts
```

### Available Scripts

```bash
npm run dev              # Start Vite dev server
npm run build            # Build frontend
npm run electron:dev     # Start Electron app (development)
npm run app:build        # Build complete application
npm run clean            # Clean build artifacts
```

### Environment Variables

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=development
```

### Development Workflow

1. **Set environment variables** (PowerShell):
   ```powershell
   $env:NODE_ENV="development"
   $env:GEMINI_API_KEY="your_actual_api_key_here"
   ```

2. **Start Vite dev server**:
   ```bash
   npx vite --port 5180
   ```

3. **Start Electron app** (in new terminal):
   ```bash
   npm run electron:dev
   ```

**Alternative**: Use the single PowerShell command that sets everything at once.

## 🎯 How It Works

1. **Take Screenshot**: Use `Ctrl + H` to capture a problem
2. **AI Analysis**: Press `Ctrl + Enter` to process with Gemini AI
3. **Smart Detection**: AI automatically identifies question type:
   - **Coding Problems**: Python + C++ solutions with explanations
   - **MCQ Questions**: Correct answer with explanation
   - **Theoretical**: Direct answer with detailed explanation
4. **Formatted Output**: Clean markdown with syntax highlighting
5. **Easy Copy**: Copy code sections with one click

## 🧠 AI Capabilities

- **Problem Analysis**: Understands context from screenshots
- **Code Generation**: Python and C++ solutions
- **Explanation**: Clear reasoning and approach
- **Complexity Analysis**: Time and space complexity
- **Multiple Formats**: Structured output for different question types

## 🛠️ Troubleshooting

### Common Issues

1. **"GEMINI_API_KEY not found"**
   - Ensure `.env` file exists in root directory
   - Check API key is correctly set
   - Restart the application

2. **App not starting**
   - Verify Node.js version (18+)
   - Run `npm install` to install dependencies
   - Check console for error messages
   - Ensure port 5180 is available for Vite dev server
   - If port conflict, use `npx vite --port 5181` and update Electron config

3. **Screenshots not working**
   - Ensure app has screen capture permissions
   - Try restarting with `Ctrl + R`

### Reset Application

If you encounter issues, use `Ctrl + R` to restart the application completely. This gives you a fresh start with all features working.

## 📝 Notes

- The application automatically handles multiple screenshots
- All AI responses are formatted in clean markdown
- Code solutions include both Python and C++ versions
- The interface is designed to be non-intrusive and transparent
- Environment variables are properly secured and not hardcoded

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Built with ❤️ using Electron, React, TypeScript, and Google Gemini AI**
