# 🌐 IntentFinder: AI-Powered Dynamic Personalization

IntentFinder is a high-performance JavaScript plugin that transforms a website's user interface and messaging in real-time based on user intent. By utilizing both local and cloud-based Large Language Models (LLMs), the engine analyzes user queries to dynamically swap layouts and generate contextually relevant content.

## ✨ Key Features

* **Hybrid AI Engine**: Seamlessly switch between local LLMs via **Ollama** (e.g., `llama3.2`) and cloud-based providers like **OpenAI** (`gpt-4o-mini`) or **OpenRouter**.
* **Dynamic UI Redesign**: Automatically replaces core site components (Header, Hero, Product Cards, etc.) using predefined layout themes such as *Cyber*, *Neo*, *Soft*, and *Modern*.
* **Intelligent Intent Mapping**: Recognizes diverse user goals like `GAMING`, `PROFESSIONAL`, `CREATIVE`, `BUDGET`, and `FAMILY` to tailor the visual experience.
* **Tailwind CSS Powered**: Injects layout skeletons styled with Tailwind utility classes for a modern, responsive look without the need for custom CSS files.
* **Plugin-Ready**: Designed to be dropped into any project and configured via a simple global configuration object.

## 🛠 Tech Stack

| Category | Technology |
| :--- | :--- |
| **Frontend** | HTML5, Tailwind CSS, Vanilla JavaScript |
| **Local AI** | Ollama (Local LLM hosting) |
| **Cloud AI** | OpenAI API, OpenRouter API |
| **Design** | Specialized Typography (Orbitron, Plus Jakarta Sans, DM Sans) |

## 🚀 How It Works

1.  **Capture**: The user enters a query (e.g., *"I need a professional monitor for color grading"*) into the intent bar.
2.  **Analyze**: `personalizer.js` sends the query to the chosen AI provider (local or cloud) to determine the user's core intent.
3.  **Decide**: The AI identifies the intent and generates optimized headlines, subheadlines, and call-to-action (CTA) text.
4.  **Transform**: The script selects a matching theme (e.g., the `soft` theme for creatives) and injects the new layouts and AI-generated copy directly into the DOM.

## ⚙️ Configuration

To use the plugin, define a `PersonalizerConfig` object on the window before the script runs:

```javascript
window.PersonalizerConfig = {
  aiProvider: 'ollama', // Options: 'ollama', 'openai', 'openrouter', 'auto'
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  openaiApiKey: 'YOUR_API_KEY' // Only needed for cloud providers
};