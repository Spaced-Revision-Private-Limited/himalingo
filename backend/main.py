import os
from fastapi import FastAPI, HTTPException
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Configuration from .env
PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')
# NOTE: Changed from 'your-index-name' to your actual index from your script
PINECONE_INDEX_NAME = os.getenv('PINECONE_INDEX_NAME', 'himalingo-dictionary')
EMBEDDING_MODEL_NAME = 'all-MiniLM-L6-v2'

# Global variables for the model and index (Loaded ONCE on startup)
print(f"--- Loading Embedding Model: {EMBEDDING_MODEL_NAME} ---")
model = SentenceTransformer(EMBEDDING_MODEL_NAME)

print(f"--- Connecting to Pinecone Index: {PINECONE_INDEX_NAME} ---")
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX_NAME)

@app.get("/")
def home():
    return {"status": "online", "message": "Himalingo Dictionary API"}

@app.get("/search")
def search(query: str, target_lang: str):
    try:
        # 1. Generate query embedding using the warm model
        query_vector = model.encode(query).tolist()
        
        # 2. Search Pinecone
        results = index.query(
            vector=query_vector,
            top_k=1,
            include_metadata=True
        )
        
        if not results.matches or results.matches[0].score < 0.6:
            return {"match": False, "message": "No close match found"}
        
        match = results.matches[0]
        metadata = match.metadata
        
        # 3. Extract metadata based on your target language
        # Matches your logic: trans_nepali, trans_newari, etc.
        meta_key = f"trans_{target_lang.lower()}"
        english = metadata.get('english', 'N/A')
        translation = metadata.get(meta_key, 'Translation not found')

        return {
            "match": True,
            "score": round(match.score, 4),
            "english": english,
            "translation": translation,
            "target_language": target_lang
        }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Run with: python -m uvicorn main:app --reload