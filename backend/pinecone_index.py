"""
Pinecone Indexing Script for Himalingo Dictionary
Replaces ChromaDB with Pinecone for global deployment
"""

import json
import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer
import time

# Load environment variables from .env file
load_dotenv()

# Configuration
PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')  # Load from .env file
PINECONE_INDEX_NAME = "Himalingo-dictionary"
EMBEDDING_MODEL = 'all-MiniLM-L6-v2'
DIMENSION = 384  # Dimension for all-MiniLM-L6-v2

def initialize_pinecone():
    """Initialize Pinecone client"""
    try:
        pc = Pinecone(api_key=PINECONE_API_KEY)
        
        # Check if index exists
        existing_indexes = pc.list_indexes().names()
        
        if PINECONE_INDEX_NAME not in existing_indexes:
            print(f"Creating index '{PINECONE_INDEX_NAME}'...")
            pc.create_index(
                name=PINECONE_INDEX_NAME,
                dimension=DIMENSION,
                metric='cosine',
                spec=ServerlessSpec(
                    cloud='aws',
                    region='us-east-1'
                )
            )
            # Wait for index to be ready
            while not pc.describe_index(PINECONE_INDEX_NAME).status['ready']:
                time.sleep(1)
            print(f"✅ Index '{PINECONE_INDEX_NAME}' created successfully!")
        else:
            print(f"✅ Using existing index '{PINECONE_INDEX_NAME}'")
        
        return pc.Index(PINECONE_INDEX_NAME)
    
    except Exception as e:
        print(f"❌ Error initializing Pinecone: {str(e)}")
        raise

def load_dictionary():
    """Load dictionary from JSON file"""
    try:
        # Get the base directory (backend folder)
        base_dir = os.path.dirname(os.path.abspath(__file__))
        dict_path = os.path.join(base_dir, 'knowledge_base', 'dictionary.json')
        
        print(f"📖 Loading dictionary from: {dict_path}")
        
        with open(dict_path, 'r', encoding='utf-8') as f:
            dictionary = json.load(f)
        
        print(f"✅ Loaded {len(dictionary)} entries from dictionary")
        return dictionary
    
    except FileNotFoundError:
        print(f"❌ Dictionary file not found at: {dict_path}")
        raise
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON: {str(e)}")
        raise

def prepare_vectors(dictionary):
    """Prepare vectors for upsert with metadata including transliterations"""
    model = SentenceTransformer(EMBEDDING_MODEL)
    vectors = []
    
    print("🔄 Generating embeddings...")
    
    for idx, entry in enumerate(dictionary):
        try:
            # Use English text as the primary embedding key
            english_text = entry.get('english', '')
            
            if not english_text:
                continue
            
            # Generate embedding
            embedding = model.encode(english_text).tolist()
            
            # Prepare metadata with ALL fields including transliterations
            metadata = {
                'english': english_text,
                # Native scripts
                'bhutia': entry.get('bhutia', ''),
                'lepcha': entry.get('lepcha', ''),
                'limbu': entry.get('limbu', ''),
                'magar': entry.get('magar', ''),
                'rai': entry.get('rai', ''),
                # Transliterations (CRUCIAL for your backend)
                'transliteration_bhutia': entry.get('transliteration_bhutia', ''),
                'transliteration_lepcha': entry.get('transliteration_lepcha', ''),
                'transliteration_limbu': entry.get('transliteration_limbu', ''),
                'transliteration_magar': entry.get('transliteration_magar', ''),
                'transliteration_rai': entry.get('transliteration_rai', ''),
                # Additional metadata
                'source': 'dictionary',
                'language_pair': 'english_to_multilingual'
            }
            
            # Create vector tuple (id, vector, metadata)
            vector_id = f"entry_{idx}_{hash(english_text)}"
            vectors.append((vector_id, embedding, metadata))
            
        except Exception as e:
            print(f"⚠️  Error processing entry {idx}: {str(e)}")
            continue
    
    print(f"✅ Generated {len(vectors)} vectors")
    return vectors

def upsert_to_pinecone(index, vectors):
    """Upsert vectors to Pinecone in batches"""
    batch_size = 100
    total_upserted = 0
    
    print("🚀 Upserting to Pinecone...")
    
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i + batch_size]
        
        try:
            response = index.upsert(vectors=batch)
            total_upserted += len(batch)
            print(f"  ✓ Batch {i//batch_size + 1}: Upserted {len(batch)} vectors (Total: {total_upserted})")
        except Exception as e:
            print(f"  ❌ Error upserting batch {i//batch_size + 1}: {str(e)}")
            continue
    
    print(f"\n✅ Successfully upserted {total_upserted} vectors to Pinecone!")
    return total_upserted

def verify_index(index):
    """Verify the index statistics"""
    try:
        stats = index.describe_index_stats()
        print("\n📊 Index Statistics:")
        print(f"   Total vectors: {stats['total_vector_count']}")
        print(f"   Dimensions: {stats['dimension']}")
        print(f"   Metric: {stats['metric']}")
        return stats
    except Exception as e:
        print(f"❌ Error getting index stats: {str(e)}")
        return None

def main():
    """Main execution function"""
    print("=" * 60)
    print("🏔️  Himalingo Dictionary - Pinecone Indexing")
    print("=" * 60)
    
    # Step 1: Initialize Pinecone
    print("\n[1/4] Initializing Pinecone...")
    index = initialize_pinecone()
    
    # Step 2: Load dictionary
    print("\n[2/4] Loading dictionary...")
    dictionary = load_dictionary()
    
    # Step 3: Prepare vectors
    print("\n[3/4] Preparing vectors with embeddings...")
    vectors = prepare_vectors(dictionary)
    
    # Step 4: Upsert to Pinecone
    print("\n[4/4] Upserting vectors to Pinecone...")
    upsert_to_pinecone(index, vectors)
    
    # Verify
    print("\n[Verification]")
    verify_index(index)
    
    print("\n" + "=" * 60)
    print("✅ Indexing Complete!")
    print("✨ Your dictionary is now available on Pinecone")
    print("🌍 Ready for global deployment!")
    print("=" * 60)

if __name__ == "__main__":
    main()
