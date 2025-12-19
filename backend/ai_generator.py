"""
AI-powered lesson and question generator using Google Gemini.
FIXED VERSION: Enforces strict separation between question text and hints
(no guidance, metadata, or parentheticals inside questions).
"""

import os
import json
import google.generativeai as genai
from typing import List, Dict, Optional
from image_service import get_image_service


class AILessonGenerator:
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the AI generator with Gemini API."""
        self.api_key = api_key or os.getenv('GEMINI_API_KEY') or os.getenv('GEMINI')
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")

        genai.configure(api_key=self.api_key)

        # Model fallback chain
        try:
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        except Exception:
            try:
                self.model = genai.GenerativeModel('gemini-2.0-flash')
            except Exception:
                self.model = genai.GenerativeModel('gemini-2.0-flash-exp')

    # ------------------------------------------------------------------
    # LESSON GENERATION
    # ------------------------------------------------------------------

    def generate_lesson(
        self,
        skill: str,
        difficulty: str = "beginner",
        student_weak_areas: List[str] = None,
        include_images: bool = True,
    ) -> Dict:
        """Generate a lesson without questions."""

        weak_areas_context = (
            f"\nFocus on these weak areas: {', '.join(student_weak_areas)}"
            if student_weak_areas
            else ""
        )

        prompt = f"""
Create a comprehensive educational lesson for the skill: {skill}
Difficulty level: {difficulty}
{weak_areas_context}

Return ONLY valid JSON using this structure:
{{
  "title": "Lesson title",
  "description": "Brief description",
  "content": "Detailed markdown lesson content",
  "learning_objectives": ["objective 1", "objective 2"],
  "key_concepts": ["concept 1", "concept 2"]
}}
"""

        response = self.model.generate_content(prompt)
        lesson_data = self._parse_json_response(response.text)

        if include_images:
            self._attach_images(skill, lesson_data)

        return lesson_data

    # ------------------------------------------------------------------
    # LESSON + QUESTIONS (STRICT FORMAT)
    # ------------------------------------------------------------------

    def generate_lesson_with_questions(
        self,
        skill: str,
        difficulty: str = "beginner",
        student_weak_areas: List[str] = None,
        include_images: bool = True,
        question_count: int = 5,
    ) -> Dict:
        """Generate a lesson and quiz questions in a single call."""

        weak_areas_context = (
            f"\nFocus on these weak areas: {', '.join(student_weak_areas)}"
            if student_weak_areas
            else ""
        )

        prompt = f"""
Create a lesson and {question_count} quiz questions for: {skill}
Difficulty: {difficulty}
{weak_areas_context}

CRITICAL QUESTION RULES (NO EXCEPTIONS):
1. The question text MUST contain ONLY a sentence with a blank: _____
2. NO parentheticals, hints, explanations, or metadata in the question text
3. The answer MUST NOT appear anywhere in the question text
4. ALL guidance MUST go in the hints array

✅ CORRECT QUESTION EXAMPLE:
Question: "The collection of books _____ valuable."
Answer: "is"
Hints:
- "Decide whether the subject is singular or plural."
- "A collection is treated as one unit."
- "Use the singular present-tense verb."

Return ONLY valid JSON using this structure:
{{
  "lesson": {{
    "title": "Lesson title",
    "description": "Brief description",
    "content": "Markdown lesson content",
    "learning_objectives": ["obj1", "obj2"],
    "key_concepts": ["concept1", "concept2"]
  }},
  "questions": [
    {{
      "question": "Sentence with _____",
      "answer": "target_word",
      "hints": ["hint1", "hint2", "hint3"],
      "type": "fill_in_the_blank",
      "difficulty": "{difficulty}"
    }}
  ]
}}
"""

        response = self.model.generate_content(prompt)
        data = self._parse_json_response(response.text)

        lesson = data.get("lesson", {})
        questions = data.get("questions", [])

        if include_images:
            self._attach_images(skill, lesson)

        return {"lesson": lesson, "questions": questions}

    # ------------------------------------------------------------------
    # QUESTION-ONLY GENERATION
    # ------------------------------------------------------------------

    def generate_questions(
        self,
        skill: str,
        difficulty: str = "beginner",
        count: int = 5,
        lesson_id: str = None,
        focus_areas: List[str] = None,
    ) -> List[Dict]:
        """Generate standalone quiz questions."""

        focus_context = (
            f"\nFocus on these areas: {', '.join(focus_areas)}"
            if focus_areas
            else ""
        )

        prompt = f"""
Generate {count} fill-in-the-blank questions for the skill: {skill}
Difficulty: {difficulty}
{focus_context}

STRICT RULES:
- Question text contains ONLY a sentence with _____
- NO explanations or parentheticals in the question
- ALL guidance goes in the hints array
- The answer word MUST NOT appear in the question

Return ONLY valid JSON array:
[
  {{
    "question": "Sentence with _____",
    "answer": "target_word",
    "hints": ["hint1", "hint2", "hint3"],
    "type": "fill_in_the_blank",
    "difficulty": "{difficulty}"
  }}
]
"""

        response = self.model.generate_content(prompt)
        questions = self._parse_json_response(response.text)

        if not isinstance(questions, list):
            questions = [questions]

        if lesson_id:
            for q in questions:
                q["lesson"] = lesson_id

        return questions

    # ------------------------------------------------------------------
    # PERSONALIZED PRACTICE
    # ------------------------------------------------------------------

    def generate_personalized_practice(
        self, student_data: Dict, skill: str, count: int = 5
    ) -> Dict:
        """Generate adaptive practice based on student performance."""

        mastery = student_data.get("mastery", {}).get(skill, 0)
        metrics = student_data.get("metrics", {}).get("skill_performance", {}).get(skill, {})

        accuracy = (
            metrics.get("correct", 0) / metrics.get("questions_answered", 1)
            if metrics.get("questions_answered", 0) > 0
            else 0
        )

        difficulty = (
            "beginner" if mastery < 0.3 else "intermediate" if mastery < 0.7 else "advanced"
        )

        struggling_areas = metrics.get("struggling_areas", [])

        prompt = f"""
Create {count} personalized fill-in-the-blank questions for {skill}.

Student profile:
- Mastery: {mastery:.2f}
- Accuracy: {accuracy:.2%}
- Struggling areas: {', '.join(struggling_areas) if struggling_areas else 'None'}

STRICT RULES:
- Question text ONLY contains a sentence with _____
- NO hints or explanations inside the question
- ALL guidance goes in the hints array
- The answer MUST NOT appear in the question text

Return ONLY valid JSON:
{{
  "practice_title": "Practice title",
  "difficulty": "{difficulty}",
  "focus_areas": {struggling_areas},
  "questions": [
    {{
      "question": "Sentence with _____",
      "answer": "target_word",
      "hints": ["hint1", "hint2", "hint3"],
      "type": "fill_in_the_blank",
      "difficulty": "{difficulty}"
    }}
  ]
}}
"""

        response = self.model.generate_content(prompt)
        return self._parse_json_response(response.text)

    # ------------------------------------------------------------------
    # HINT GENERATION
    # ------------------------------------------------------------------

    def generate_hints(self, question: str, answer: str, count: int = 3) -> List[str]:
        """Generate progressive hints for a question."""

        prompt = f"""
Generate {count} progressive hints.

Question: {question}
Answer: {answer}

Rules:
- Hints must NOT include the answer
- Start general and become specific

Return ONLY valid JSON array:
["hint 1", "hint 2", "hint 3"]
"""

        response = self.model.generate_content(prompt)
        hints = self._parse_json_response(response.text)
        return hints if isinstance(hints, list) else []

    # ------------------------------------------------------------------
    # HELPERS
    # ------------------------------------------------------------------

    def _attach_images(self, skill: str, lesson_data: Dict):
        """Attach images to lesson content if enabled."""
        image_service = get_image_service()
        if not image_service.enabled:
            return

        key_concepts = lesson_data.get("key_concepts", [])
        images = image_service.get_images_for_lesson(skill, key_concepts)

        if "_header" in images:
            header_md = image_service.format_image_markdown(
                images["_header"], f"{skill.title()} Lesson"
            )
            lesson_data["content"] = header_md + lesson_data.get("content", "")

        lesson_data["images"] = images

    def _parse_json_response(self, text: str):
        """Parse JSON safely from Gemini responses."""
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]

        try:
            return json.loads(text.strip())
        except json.JSONDecodeError as e:
            raise Exception(f"JSON parse failed: {e}\nResponse: {text}")


# ----------------------------------------------------------------------
# SINGLETON ACCESSOR
# ----------------------------------------------------------------------

_generator_instance = None


def get_generator() -> AILessonGenerator:
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = AILessonGenerator()
    return _generator_instance
