import os
import sys
from dotenv import load_dotenv
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

# Load environment variables
load_dotenv()

# Configuration
PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')
PINECONE_INDEX_NAME = os.getenv('PINECONE_INDEX_NAME', 'Himalingo-dictionary')
EMBEDDING_MODEL = 'all-MiniLM-L6-v2'

# Global cache for model and index (loaded once, reused across calls)
_model_cache = None
_index_cache = None

def get_model():
    """Load model once and cache it"""
    global _model_cache
    if _model_cache is None:
        print(f"[Python] Loading embedding model: {EMBEDDING_MODEL}", file=sys.stderr)
        _model_cache = SentenceTransformer(EMBEDDING_MODEL)
    return _model_cache

def get_index():
    """Initialize Pinecone index once and cache it"""
    global _index_cache
    if _index_cache is None:
        print("[Python] Initializing Pinecone connection", file=sys.stderr)
        pc = Pinecone(api_key=PINECONE_API_KEY)
        _index_cache = pc.Index(PINECONE_INDEX_NAME)
    return _index_cache

def search_pinecone(query, target_lang):
    try:
        # 1. Get cached model and index
        model = get_model()
        index = get_index()
        
        # 2. Generate query embedding
        query_vector = model.encode(query).tolist()
        
        # 3. Search (top_k=1 is usually enough for a dictionary)
        results = index.query(
            vector=query_vector,
            top_k=1,
            include_metadata=True
        )
        
        if not results.matches or results.matches[0].score < 0.6:
            # Score < 0.6 means the match is too weak (random gibberish)
            print("NO_MATCH")
            return
        
        match = results.matches[0]
        metadata = match.metadata
        
        # 4. Extract the metadata keys (Matching your Indexing script)
        meta_key = f"trans_{target_lang.lower()}"
        english = metadata.get('english', '')
        transliteration = metadata.get(meta_key, '')

        if english and transliteration:
            # Output only the specific transliteration for Node.js to read
            print(f"English: {english} | {target_lang.capitalize()}: {transliteration}")
        else:
            print("NO_MATCH")
            
    except Exception as e:
        # Ensure we don't crash Node.js with a weird error format
        print(f"PINECONE_ERROR: {str(e)}", file=sys.stderr)
        print("NO_MATCH")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("NO_MATCH")
        sys.exit(0)
    
    query_text = sys.argv[1]
    lang = sys.argv[2]
    
    search_pinecone(query_text, lang)