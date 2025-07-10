# main.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
import base64
from pathlib import Path
from docx import Document
from fastapi import Request
from pydantic import BaseModel
import openai
import uuid
from fastapi.responses import FileResponse
from datetime import datetime
from dotenv import load_dotenv
import json
import re
import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"

@app.get("/api/templates/{category}", summary="List Templates", description="Returns a list of .docx templates for a given category.")
def list_templates(category: str):
    category_path = TEMPLATES_DIR / category
    if not category_path.exists() or not category_path.is_dir():
        raise HTTPException(status_code=404, detail="Category not found")
    
    files = [f.name for f in category_path.glob("*.docx")]
    return {"templates": files}

@app.get("/api/template", summary="Get Template File", description="Returns the .docx file as a base64-encoded string.")
def get_template(category: str = Query(...), name: str = Query(...)):
    file_path = TEMPLATES_DIR / category / name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    with open(file_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
    return {"base64": encoded}

@app.get("/api/template/sections", summary="Extract Template Sections", description="Returns section headings that start with 'template for' from a .docx file.")
def get_template_sections(category: str = Query(...), name: str = Query(...)):
    file_path = TEMPLATES_DIR / category / name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    doc = Document(file_path)
    sections = []
    for para in doc.paragraphs:
        if para.text.strip().lower().startswith("template for"):
            sections.append(para.text.strip())

    if not sections:
        sections = ["Full Document"]  # fallback for single-template files
    return {"sections": sections}

# Add your OpenAI API key securely
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

class AIStartRequest(BaseModel):
    category: str           # e.g. "possession"
    subtype: str | None = None            # e.g. "private" or "local" | Make it optional
    user_input: str         # e.g. "The landlord failed to serve a Section 21 notice"

@app.post("/api/ai/start", summary="Start AI Flow", description="Selects the best template based on user input and returns the first question.")
def start_ai_flow(data: AIStartRequest):
    try:
        # Determine correct metadata path
        metadata_path = (
            TEMPLATES_DIR / data.category / data.subtype / "metadata.json"
            if data.subtype else TEMPLATES_DIR / data.category / "metadata.json"
        )

        if not metadata_path.exists():
            raise HTTPException(status_code=500, detail="metadata.json not found")

        with open(metadata_path, "r", encoding="utf-8") as f:
            templates = json.load(f)

        if not templates:
            raise HTTPException(status_code=404, detail="No templates found.")

        # Let GPT select the best template
        summaries_str = "\n\n".join(
            [f"Title: {t['title']}\nSummary: {t['summary']}" for t in templates]
        )

        selection_prompt = (
            f"You are a legal assistant. A user described their issue as:\n\n"
            f"{data.user_input.strip()}\n\n"
            f"Here are available legal document templates:\n\n"
            f"{summaries_str}\n\n"
            f"Based on the user's input, respond ONLY with the exact filename (e.g. example.docx) that best matches."
        )

        response = openai.chat.completions.create(
            model="gpt-4",  
            messages=[{"role": "user", "content": selection_prompt}],
            temperature=0.3,
            max_tokens=60,
        )

        selected_filename = response.choices[0].message.content.strip()
        logging.info(f"🔹 Selected Template: {selected_filename}")

        # Load selected .docx
        doc_path = (
            TEMPLATES_DIR / data.category / data.subtype / selected_filename
            if data.subtype else TEMPLATES_DIR / data.category / selected_filename
        )

        if not doc_path.exists():
            raise HTTPException(status_code=404, detail="Selected template not found")

        doc = Document(doc_path)
        full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])

        # Ask GPT the first question
        question_prompt = (
            "You are a legal document assistant. Analyze the template and generate "
            "the FIRST question you would ask the user to begin collecting the required information."
        )

        q_response = openai.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": question_prompt},
                {"role": "user", "content": full_text}
            ],
            temperature=0.3,
            max_tokens=150,
        )

        question = q_response.choices[0].message.content.strip()

        return {
            "question": question,
            "filename": selected_filename
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AINextRequest(BaseModel):
    category: str
    filename: str
    messages: List[dict]  # [{"role": "user", "content": "..."}]

@app.post("/api/ai/next", summary="AI - Next Question", description="Continues the AI flow by asking the next required question.")
def ai_next_question(data: AINextRequest):
    file_path = TEMPLATES_DIR / data.category / data.filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Template not found")

    # Read template again
    doc = Document(file_path)
    template_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip() != ""])

    system_prompt = (
        "You are an AI legal assistant. The goal is to help the user fill out the document template below.\n"
        "Ask one question at a time to collect necessary information. Do not repeat previous questions.\n"
        "Once you have enough information, reply with: '__COMPLETE__'."
    )

    try:
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": f"This is the template:\n\n{template_text}" },
                *data.messages
            ],
            temperature=0.3,
            max_tokens=300
        )

        reply = response["choices"][0]["message"]["content"]

        usage = response['usage']
        logging.info(f"🔹 Token Usage → Prompt: {usage['prompt_tokens']} | Completion: {usage['completion_tokens']} | Total: {usage['total_tokens']}")

        return { "reply": reply }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AICompleteRequest(BaseModel):
    category: str
    filename: str
    messages: List[dict]  # [{"role": "user", "content": "..."}]

def extract_answers(messages: List[dict]):
    answers = []
    for i in range(1, len(messages), 2):
        if messages[i]["role"] == "user":
            answers.append(messages[i]["content"])
    return answers

# Add just before the AICompleteRequest class and complete_template endpoint:

@app.get("/api/categories", summary="List Available Categories & Subtypes")
def list_categories():
    categories = {}

    for cat in TEMPLATES_DIR.iterdir():
        if not cat.is_dir():
            continue

        subtypes = []
        for sub in cat.iterdir():
            if sub.is_dir():
                has_metadata = (sub / "metadata.json").exists()
                has_docx = any(f.suffix == ".docx" for f in sub.glob("*.docx"))
                if has_metadata or has_docx:
                    subtypes.append(sub.name)

        # Check if category itself has .docx or metadata (i.e., no subtypes)
        has_root_docx = any(f.suffix == ".docx" for f in cat.glob("*.docx"))
        has_root_metadata = (cat / "metadata.json").exists()

        if subtypes or has_root_docx or has_root_metadata:
            categories[cat.name] = subtypes

    return categories


@app.post("/api/ai/complete", summary="Complete Template", description="Fills in the document template based on user answers and returns the generated .docx file.")
def complete_template(data: AICompleteRequest):
    file_path = TEMPLATES_DIR / data.category / data.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Template not found")

    doc = Document(file_path)
    template_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip() != ""])

    system_prompt = (
        "You are a document filling assistant. Below is a legal template followed by a chat conversation.\n"
        "Your task is to extract placeholder-value pairs in the form of JSON where the key is the placeholder like 'Claimant Name' "
        "and the value is the appropriate user-provided input from the conversation.\n\n"
        "ONLY return a valid JSON object. Do NOT include any explanation.\n"
        "Match placeholders to user answers as accurately as possible."
    )

    user_messages = "\n".join([
        f"{msg['role'].capitalize()}: {msg['content']}" for msg in data.messages
    ])

    full_prompt = f"TEMPLATE:\n{template_text}\n\nCONVERSATION:\n{user_messages}"

    try:
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": full_prompt }
            ],
            temperature=0.2,
            max_tokens=800
        )

        json_str = response['choices'][0]['message']['content']
        
        try:
            field_values = json.loads(json_str)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="AI returned invalid JSON")


        for para in doc.paragraphs:
            for placeholder in re.findall(r"\[(.+?)\]", para.text):
                if placeholder in field_values:
                   para.text = para.text.replace(f"[{placeholder}]", field_values[placeholder])
                else:
                    logging.warning(f"⚠️ Missing value for placeholder: [{placeholder}]")


        output_dir = BASE_DIR / "generated"
        output_dir.mkdir(exist_ok=True)
        filename = f"{uuid.uuid4().hex}_{data.filename}"
        output_path = output_dir / filename
        doc.save(output_path)

        return FileResponse(
            output_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=f"filled_{data.filename}"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
