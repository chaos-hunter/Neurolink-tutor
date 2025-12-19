"""
Test script for AI lesson generator.
Run this to verify your Gemini API key is working.
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_ai_generator():
    """Test the AI generator functionality."""
    print("=" * 50)
    print("Testing AI Lesson Generator")
    print("=" * 50)
    
    # Check if API key is set
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY not found in .env file")
        print("\nSetup instructions:")
        print("1. Get API key from: https://makersuite.google.com/app/apikey")
        print("2. Add to backend/.env: GEMINI_API_KEY=your-key-here")
        return False
    
    print(f"✅ API key found: {api_key[:10]}...")
    
    # Try to import and initialize
    try:
        from ai_generator import AILessonGenerator
        print("✅ AI generator module imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import AI generator: {e}")
        print("\nMake sure you've installed dependencies:")
        print("pip install google-generativeai python-dotenv")
        return False
    
    # Try to initialize generator
    try:
        generator = AILessonGenerator(api_key)
        print("✅ AI generator initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize generator: {e}")
        return False
    
    # Test lesson generation
    print("\n" + "=" * 50)
    print("Testing Lesson Generation")
    print("=" * 50)
    
    try:
        print("Generating a sample vocabulary lesson...")
        lesson = generator.generate_lesson(
            skill="vocabulary",
            difficulty="beginner"
        )
        print("✅ Lesson generated successfully!")
        print(f"\nTitle: {lesson.get('title')}")
        print(f"Description: {lesson.get('description')}")
        print(f"Learning Objectives: {len(lesson.get('learning_objectives', []))} items")
        print(f"Key Concepts: {len(lesson.get('key_concepts', []))} items")
    except Exception as e:
        print(f"❌ Lesson generation failed: {e}")
        return False
    
    # Test question generation
    print("\n" + "=" * 50)
    print("Testing Question Generation")
    print("=" * 50)
    
    try:
        print("Generating 3 sample questions...")
        questions = generator.generate_questions(
            skill="grammar",
            difficulty="beginner",
            count=3
        )
        print(f"✅ Generated {len(questions)} questions successfully!")
        
        for i, q in enumerate(questions, 1):
            print(f"\nQuestion {i}:")
            print(f"  Q: {q.get('question')[:60]}...")
            print(f"  A: {q.get('answer')}")
            print(f"  Hints: {len(q.get('hints', []))} hints")
    except Exception as e:
        print(f"❌ Question generation failed: {e}")
        return False
    
    # Test hint generation
    print("\n" + "=" * 50)
    print("Testing Hint Generation")
    print("=" * 50)
    
    try:
        print("Generating hints for a sample question...")
        hints = generator.generate_hints(
            question="What is the capital of France?",
            answer="Paris",
            count=3
        )
        print(f"✅ Generated {len(hints)} hints successfully!")
        
        for i, hint in enumerate(hints, 1):
            print(f"  Hint {i}: {hint}")
    except Exception as e:
        print(f"❌ Hint generation failed: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("✅ All tests passed! AI features are working correctly.")
    print("=" * 50)
    return True


if __name__ == "__main__":
    success = test_ai_generator()
    exit(0 if success else 1)
