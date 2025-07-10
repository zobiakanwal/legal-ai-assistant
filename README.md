# Legal AI Assistant 🧑‍⚖️⚖️🤖

This is an AI-powered assistant for generating and filling legal document templates.  
Users can describe their legal issue, and the assistant selects the appropriate template, collects details step-by-step, and generates a ready-to-use document.

---

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS  
- **Backend**: FastAPI (Python)  
- **AI Integration**: OpenAI GPT-4 API  
- **Document Handling**: python-docx  
- **Environment Management**: dotenv  

---

## 📁 Project Structure

<pre>
legal-assistant-app/
├── backend/                 # FastAPI backend with AI + docx handling
│   ├── main.py
│   ├── summarize_templates.py
│   ├── templates/
│   ├── .env.example
│   └── requirements.txt
├── frontend/                # Vite + React frontend with chat interface
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
└── README.md
</pre>

---

## 🧪 Setup Instructions

### 🔹 Backend (FastAPI + OpenAI)

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Create a .env file based on the example
# .env
OPENAI_API_KEY=your_openai_api_key

# Run the FastAPI server
uvicorn main:app --reload
```

### 🔹 Frontend (React + Vite)

```bash
# Navigate to the frontend folder:
cd frontend

#Install frontend dependencies:
npm install

#Start the development server:
npm run dev
```

### 🚀 Features

- ✅ AI selects the best legal template based on user input.  
- ✅ Asks one question at a time to collect details efficiently.
- ✅ Auto-fills legal document placeholders using GPT.
- ✅ Allows download of ready-to-use .docx legal files.
- ✅ Built-in support for multiple legal categories and templates.



### 🔒 Environment & Security

This project uses .env to manage sensitive keys like your OpenAI API key.  
Example .env file:

```
#.env.example
OPENAI_API_KEY=your_openai_api_key
```

### 🌐 Live Demo

🚧 Deployment link coming soon…  
