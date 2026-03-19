import chromadb
from sentence_transformers import SentenceTransformer
import os

# 1. Setup paths and model
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_PATH = os.path.join(BASE_DIR, "chroma_db_data")

model = SentenceTransformer('all-MiniLM-L6-v2')
client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = client.get_collection(name="himalingo_dictionary")

# 2. Ask a question
query_text = "How do I say thank you in Bhutia?"

# 3. Search ChromaDB
# We turn the question into a vector first
query_vector = model.encode(query_text).tolist()

results = collection.query(
    query_embeddings=[query_vector],
    n_results=1 # Get the single best match
)

# 4. Print the result
if results['documents']:
    print("\n--- Search Result ---")
    print(f"Query: {query_text}")
    print(f"Matched Text: {results['documents'][0][0]}")
    print(f"Bhutia Word: {results['metadatas'][0][0]['bhutia']}")
    print("---------------------\n")
else:
    print("No match found.")