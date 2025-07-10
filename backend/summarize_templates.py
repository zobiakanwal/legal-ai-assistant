import os
import json
import openai
from pathlib import Path
from docx import Document
from dotenv import load_dotenv
from time import sleep

# Load environment variables
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# Define your base path and model
TEMPLATES_ROOT = Path(__file__).resolve().parent / "templates"
USE_GPT_MODEL = "gpt-4"  # Use gpt-3.5-turbo to reduce cost if needed

# Summarize a single document using GPT
def summarize_template(file_path: Path) -> dict | None:
    try:
        doc = Document(file_path)
        full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])

        prompt = (
            "Below is a legal document template. Your task is to generate:\n"
            "1. A clear, user-friendly title (max 8 words)\n"
            "2. A concise summary (2–3 sentences max) explaining what the template is used for, "
            "what legal argument it supports, and any unique context it applies to.\n\n"
            f"Document content:\n{full_text}"
        )

        messages = [
            {"role": "system", "content": "You are a legal document analyst."},
            {"role": "user", "content": prompt}
        ]

        completion = openai.chat.completions.create(
            model=USE_GPT_MODEL,
            messages=messages,
            temperature=0.4,
            max_tokens=350,
        )

        reply = completion.choices[0].message.content.strip()

        # ✅ Optional cost/logging (safe fallback if usage is not available)
        try:
            total_tokens = completion.usage.total_tokens
        except Exception:
            total_tokens = 0

        if total_tokens:
            print(f"   ✅ Summary generated ({total_tokens} tokens)")
        else:
            print(f"   ✅ Summary generated (token usage not available)")

        return {
            "raw": reply,
            "tokens": total_tokens
        }

    except Exception as e:
        print(f"   ❌ Error summarizing {file_path.name}: {e}")
        return None

# Process a folder like /possession/private
def process_folder(folder_path: Path):
    print(f"\n📂 Processing folder: {folder_path.relative_to(TEMPLATES_ROOT)}")

    metadata_file = folder_path / "metadata.json"
    existing_summaries = {}

    if metadata_file.exists():
        try:
            with open(metadata_file, "r", encoding="utf-8") as f:
                for item in json.load(f):
                    existing_summaries[item["filename"]] = item
        except:
            print("⚠️ Could not read existing metadata, starting fresh.")

    updated_metadata = []

    for file in folder_path.glob("*.docx"):
        if file.name in existing_summaries:
            print(f"   ⏭️ Skipping {file.name} (cached)")
            updated_metadata.append(existing_summaries[file.name])
            continue

        print(f"   ✍️ Summarizing {file.name}")
        result = summarize_template(file)
        if result:
            lines = result["raw"].split("\n")
            title = lines[0].replace("Title:", "").strip()
            summary = lines[1].replace("Summary:", "").strip() if len(lines) > 1 else ""

            updated_metadata.append({
                "title": title,
                "summary": summary,
                "filename": file.name
            })

            sleep(1)  # To respect OpenAI rate limits

    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(updated_metadata, f, indent=2)

    print(f"💾 Saved {len(updated_metadata)} summaries → {metadata_file}")

# Main function
def run_all():
    for category in TEMPLATES_ROOT.iterdir():
        if category.is_dir():
            docx_files = list(category.glob("*.docx"))
            if docx_files:  # Direct .docx files inside category
                process_folder(category)
            else:
                for subtype in category.iterdir():
                    if subtype.is_dir():
                        process_folder(subtype)


if __name__ == "__main__":
    run_all()
