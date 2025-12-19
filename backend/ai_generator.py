"""
AI-powered lesson and question generator using Google Gemini.
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
        try:
            # Using the models revealed by your health check scanner
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        except Exception:
            try:
                self.model = genai.GenerativeModel('gemini-2.0-flash')
            except Exception:
                self.model = genai.GenerativeModel('gemini-2.0-flash-exp')

    def generate_lesson(self, skill: str, difficulty: str = "beginner",
                       student_weak_areas: List[str] = None, include_images: bool = True) -> Dict:
        """Generate a complete lesson with content and learning objectives."""

        weak_areas_context = ""
        if student_weak_areas:
            weak_areas_context = f"\nFocus on these weak areas: {', '.join(student_weak_areas)}"

        prompt = f"""Create a comprehensive educational lesson for the skill: {skill}
Difficulty level: {difficulty}
{weak_areas_context}

Generate a lesson with the following structure in JSON format:
{{
    "title": "Engaging lesson title",
    "description": "Brief description of what students will learn",
    "content": "Detailed lesson content with explanations, examples, and key concepts (use markdown formatting)",
    "learning_objectives": ["objective 1", "objective 2", "objective 3"],
    "key_concepts": ["concept 1", "concept 2", "concept 3"]
}}

Make the content engaging, clear, and appropriate for {difficulty} level students.
Return ONLY valid JSON, no additional text."""

        try:
            response = self.model.generate_content(prompt)
            lesson_data = self._parse_json_response(response.text)

            # Add images if enabled
            if include_images:
                image_service = get_image_service()
                if image_service.enabled:
                    key_concepts = lesson_data.get('key_concepts', [])
                    images = image_service.get_images_for_lesson(skill, key_concepts)

                    # Add header image to content
                    if '_header' in images:
                        header_img = image_service.format_image_markdown(
                            images['_header'],
                            f"{skill.title()} Lesson"
                        )
                        lesson_data['content'] = header_img + lesson_data['content']

                    # Store image URLs for admin editing
                    lesson_data['images'] = images

            return lesson_data
        except Exception as e:
            raise Exception(f"Failed to generate lesson: {str(e)}")

    def generate_lesson_with_questions(self, skill: str, difficulty: str = "beginner",
                                     student_weak_areas: List[str] = None, include_images: bool = True,
                                     question_count: int = 5) -> Dict:
        """Generate a complete lesson AND companion questions in a single AI call for speed."""

        weak_areas_context = ""
        if student_weak_areas:
            weak_areas_context = f"\nFocus on these weak areas: {', '.join(student_weak_areas)}"

        prompt = f"""Create a comprehensive educational package for: {skill}
Difficulty level: {difficulty}
{weak_areas_context}

        Generate BOTH a lesson and {question_count} quiz questions in a single JSON structure.

        CRITICAL QUESTION FORMAT (NO LEAKS):
        Questions MUST be in a "Fill-in-the-blank" format where the student identifies the correct word.

        ✅ CORRECT EXAMPLE:
        Question: Complete the sentence with the correct verb form: "The collection of books _____ valuable." (The verb is: be)
        Answer: "is"

        ❌ WRONG EXAMPLE (DO NOT DO THIS):
        Question: Complete the sentence with the correct verb form: "The collection of books is _____ valuable." (The verb is: be)
        Answer: "is"

        ULTRA-IMPORTANT: The answer word itself ("is" in the example) MUST NOT appear in the question text. You MUST use a blank (_____) in its place. If you include the answer in the question, the student won't learn anything.

        Target JSON structure:
        {{
            "lesson": {{
                "title": "Engaging lesson title",
                "description": "Brief description",
                "content": "Detailed content (markdown)",
                "learning_objectives": ["obj1", "obj2"],
                "key_concepts": ["concept1", "concept2"]
            }},
            "questions": [
                {{
                    "question": "Complete the sentence by making the noun plural: \"I have two _____.\" (The word to make plural is: book)",
                    "answer": "books",
                    "hints": ["hint1", "hint2", "hint3"],
                    "type": "fill_in_the_blank",
                    "difficulty": "{difficulty}"
                }}
            ]
        }}

Make the content engaging and the questions helpful.
Return ONLY valid JSON, no additional text."""

        try:
            response = self.model.generate_content(prompt)
            data = self._parse_json_response(response.text)

            lesson_data = data.get('lesson', {})
            questions = data.get('questions', [])

            # Add images if enabled
            if include_images:
                try:
                    image_service = get_image_service()
                    if image_service.enabled:
                        key_concepts = lesson_data.get('key_concepts', [])
                        images = image_service.get_images_for_lesson(skill, key_concepts)
                        if '_header' in images:
                            header_img = image_service.format_image_markdown(images['_header'], f"{skill.title()} Lesson")
                            lesson_data['content'] = header_img + lesson_data['content']
                        lesson_data['images'] = images
                except Exception as img_err:
                    print(f"Warning: Image service failed: {img_err}")

            return {
                "lesson": lesson_data,
                "questions": questions
            }
        except Exception as e:
            raise Exception(f"Failed to generate combined package: {str(e)}")

    def generate_questions(self, skill: str, difficulty: str = "beginner",
                          count: int = 5, lesson_id: str = None,
                          focus_areas: List[str] = None) -> List[Dict]:
        """Generate multiple questions for a specific skill."""

        focus_context = ""
        if focus_areas:
            focus_context = f"\nFocus these questions on: {', '.join(focus_areas)}"

        prompt = f"""Generate {count} educational questions for the skill: {skill}
Difficulty level: {difficulty}
{focus_context}

        CRITICAL QUESTION FORMAT (NO LEAKS):
        Questions MUST be in a "Fill-in-the-blank" format where the student identifies the correct word.

        ✅ CORRECT EXAMPLE:
        Question: Complete the sentence with the correct verb form: "The collection of books _____ valuable." (The verb is: be)
        Answer: "is"

        ❌ WRONG EXAMPLE (DO NOT DO THIS):
        Question: Complete the sentence with the correct verb form: "The collection of books is _____ valuable." (The verb is: be)
        Answer: "is"

        ULTRA-IMPORTANT: The answer word itself ("is" in the example) MUST NOT appear in the question text. You MUST use a blank (_____) in its place. If you include the answer in the question, the student won't learn anything.

        Return a JSON array with this exact structure:
        [
            {{
                "question": "The question text (fill-in-the-blank style)",
                "answer": "target_word",
                "hints": ["hint 1", "hint 2", "hint 3"],
                "type": "fill_in_the_blank",
                "difficulty": "{difficulty}"
            }}
        ]

Make questions educational, clear, and progressively challenging.
Return ONLY valid JSON array, no additional text."""

        try:
            response = self.model.generate_content(prompt)
            questions = self._parse_json_response(response.text)

            # Ensure it's a list
            if not isinstance(questions, list):
                questions = [questions]

            # Add lesson_id if provided
            if lesson_id:
                for q in questions:
                    q['lesson'] = lesson_id

            return questions
        except Exception as e:
            raise Exception(f"Failed to generate questions: {str(e)}")

    def generate_personalized_practice(self, student_data: Dict,
                                      skill: str, count: int = 5) -> Dict:
        """Generate personalized practice based on student performance."""

        mastery = student_data.get('mastery', {}).get(skill, 0)
        metrics = student_data.get('metrics', {}).get('skill_performance', {}).get(skill, {})

        accuracy = 0
        if metrics.get('questions_answered', 0) > 0:
            accuracy = metrics.get('correct', 0) / metrics.get('questions_answered', 1)

        # Determine difficulty based on mastery
        if mastery < 0.3:
            difficulty = "beginner"
        elif mastery < 0.7:
            difficulty = "intermediate"
        else:
            difficulty = "advanced"

        struggling_areas = metrics.get('struggling_areas', [])

        prompt = f"""Generate a personalized practice set for a student learning {skill}.

Student Profile:
- Current mastery: {mastery:.2f} (0-1 scale)
- Accuracy: {accuracy:.2%}
- Struggling areas: {', '.join(struggling_areas) if struggling_areas else 'None identified'}

Create {count} questions that:
1. Match their current level ({difficulty})
2. Address their weak areas
3. Gradually increase in difficulty
4. Build confidence while challenging them

        CRITICAL QUESTION FORMAT (NO LEAKS):
        Questions MUST be in a "Fill-in-the-blank" format where the student identifies the correct word.

        ✅ CORRECT EXAMPLE:
        Question: Complete the sentence with the correct verb form: "The collection of books _____ valuable." (The verb is: be)
        Answer: "is"

        ❌ WRONG EXAMPLE (DO NOT DO THIS):
        Question: Complete the sentence with the correct verb form: "The collection of books is _____ valuable." (The verb is: be)
        Answer: "is"

        ULTRA-IMPORTANT: The answer word itself ("is" in the example) MUST NOT appear in the question text. You MUST use a blank (_____) in its place. If you include the answer in the question, the student won't learn anything.

        Return JSON with this structure:
        {{
            "practice_title": "Personalized practice title",
            "difficulty": "{difficulty}",
            "focus_areas": ["area1", "area2"],
            "questions": [
                {{
                    "question": "The question text (fill-in-the-blank style)",
                    "answer": "target_word",
                    "hints": ["hint1", "hint2", "hint3"],
                    "type": "fill_in_the_blank",
                    "difficulty": "difficulty_level"
                }}
            ]
        }}

Return ONLY valid JSON, no additional text."""

        try:
            response = self.model.generate_content(prompt)
            practice_data = self._parse_json_response(response.text)
            return practice_data
        except Exception as e:
            raise Exception(f"Failed to generate personalized practice: {str(e)}")

    def generate_hints(self, question: str, answer: str, count: int = 3) -> List[str]:
        """Generate progressive hints for a question."""

        prompt = f"""Generate {count} progressive hints for this question:

Question: {question}
Answer: {answer}

Create hints that:
1. Start general and become more specific
2. Guide thinking without giving away the answer
3. Are educational and encouraging

Return a JSON array of hint strings:
["hint 1", "hint 2", "hint 3"]

Return ONLY valid JSON array, no additional text."""

        try:
            response = self.model.generate_content(prompt)
            hints = self._parse_json_response(response.text)
            return hints if isinstance(hints, list) else []
        except Exception as e:
            raise Exception(f"Failed to generate hints: {str(e)}")

    def _parse_json_response(self, text: str) -> Dict:
        """Parse JSON from Gemini response, handling markdown code blocks."""
        # Remove markdown code blocks if present
        text = text.strip()
        if text.startswith('```json'):
            text = text[7:]
        elif text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]

        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse JSON response: {str(e)}\nResponse: {text}")


# Singleton instance
_generator_instance = None

def get_generator() -> AILessonGenerator:
    """Get or create the AI generator instance."""
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = AILessonGenerator()
    return _generator_instance
