import json
import math
import os
import random
import time
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from database import db, Student, Domain, init_db

# Load environment variables
load_dotenv()

# Import AI generator
try:
    from ai_generator import get_generator
    AI_ENABLED = True
except Exception as e:
    print(f"AI Generator not available: {e}")
    AI_ENABLED = False

app = Flask(__name__)
# Explicitly allow the Vercel origin and standard headers/methods
CORS(app, resources={r"/api/*": {
    "origins": ["https://neurolink-tutor.vercel.app", "http://localhost:3000"],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})
init_db(app)

@app.before_request
def log_request_info():
    print(f"Request: {request.method} {request.path} from {request.remote_addr}")

@app.route('/api/health')
def health_check():
    db_status = "error"
    try:
        # Actually try to query the DB to verify connection
        Domain.query.first()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    ai_status = "disabled"
    available_models = []
    if AI_ENABLED:
        try:
            import google.generativeai as genai
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    available_models.append(m.name)
            ai_status = "enabled"
        except Exception as e:
            ai_status = f"error: {str(e)}"

    return jsonify({
        "status": "healthy",
        "database": db_status,
        "ai": ai_status,
        "available_models": available_models[:5], # Show first 5
        "env": os.getenv('FLASK_ENV', 'not set')
    }), 200

@app.errorhandler(Exception)
def handle_exception(e):
    """Ensure CORS headers are sent even on errors."""
    print(f"Unhandled Exception: {str(e)}")
    response = jsonify({"error": "Internal Server Error", "details": str(e)})
    response.status_code = 500
    # Flask-CORS should handle this, but we can be safe
    return response

file_lock = threading.Lock()

DATA_DIR = 'data'
DOMAIN_FILE = os.path.join(DATA_DIR, 'domain.json')
STUDENT_FILE = os.path.join(DATA_DIR, 'student.json')
DEFAULT_SKILLS = ["vocabulary", "grammar", "reading_comprehension", "spelling", "writing"]
ADMIN_ACCESS_CODE = "admin"

# --- Database Helper Functions ---
def db_load_domain():
    """Retrieve all domain data from the database."""
    data = {}
    items = Domain.query.all()
    for item in items:
        data[item.category] = item.data
    return data

def db_save_domain_category(category, data):
    """Save a specific domain category to the database."""
    item = Domain.query.get(category)
    if not item:
        item = Domain(category=category, data=data)
        db.session.add(item)
    else:
        item.data = data
    db.session.commit()

def db_load_students():
    """Retrieve all students (for compatibility with existing logic)."""
    students = {}
    items = Student.query.all()
    for item in items:
        students[item.username] = item.data
    return students

def db_load_student(username):
    """Retrieve a single student profil."""
    item = Student.query.get(username)
    return item.data if item else None

def db_save_student(username, data):
    """Save/update a single student profile."""
    item = Student.query.get(username)
    if not item:
        item = Student(username=username, data=data)
        db.session.add(item)
    else:
        item.data = data
    db.session.commit()

def db_delete_student(username):
    """Delete a single student profile from the database."""
    item = Student.query.get(username)
    if item:
        db.session.delete(item)
        db.session.commit()
        return True
    return False

# Old JSON helpers (can be redirected to DB)
def read_json_file(file_path):
    if 'student.json' in file_path:
        return db_load_students()
    return db_load_domain()

def write_json_file(file_path, data):
    if 'student.json' in file_path:
        # This is inefficient but maintains compatibility for now
        for username, student_data in data.items():
            db_save_student(username, student_data)
    else:
        for category, cat_data in data.items():
            db_save_domain_category(category, cat_data)


def clamp(value, min_value=0.0, max_value=1.0):
    """Clamp a value between min_value and max_value."""
    return max(min_value, min(max_value, value))


def slugify_label(label):
    """Convert a human label into a safe identifier."""
    return label.strip().lower().replace(' ', '_')

def choose_skill_based_on_metrics(student, unmastered_skills):
    """Choose skill based on performance metrics."""
    metrics = student.get('metrics', {}).get('skill_performance', {})

    # Prioritize skills with struggling areas
    struggling_skills = []
    for skill in unmastered_skills:
        if skill in metrics and metrics[skill].get('struggling_areas'):
            struggling_skills.append(skill)

    if struggling_skills:
        return random.choice(struggling_skills)

    # Otherwise, pick skill with lowest accuracy
    skill_accuracy = {}
    for skill in unmastered_skills:
        if skill in metrics:
            correct = metrics[skill].get('correct', 0)
            total = metrics[skill].get('questions_answered', 1)
            skill_accuracy[skill] = correct / total if total > 0 else 0
        else:
            skill_accuracy[skill] = 0

    # Return skill with lowest accuracy
    return min(skill_accuracy.keys(), key=lambda k: skill_accuracy[k])


def get_question_stats(domain_data):
    """Return mutable question stats, initializing structure if missing."""
    question_stats = domain_data.setdefault('question_stats', {})
    return question_stats


def ensure_lessons(domain_data):
    """Guarantee every skill has at least one lesson placeholder."""
    lessons = domain_data.setdefault('lessons', {})
    for skill in get_all_skills(domain_data):
        if skill not in lessons or not lessons[skill]:
            lessons[skill] = [{
                'id': f"{skill}_lesson_1",
                'title': f"{skill.replace('_', ' ').title()}",
                'description': 'Core practice for this skill.',
                'content': 'Lesson content.'
            }]
    return lessons


def build_diagnostic_questions(domain_data):
    """Return one low-stakes question per skill for onboarding assessment."""
    questions = []
    question_stats = get_question_stats(domain_data)

    difficulty_rank = {'beginner': 0, 'intermediate': 1, 'advanced': 2}

    for skill in get_all_skills(domain_data):
        skill_questions = [q for q in domain_data.get('questions', []) if q.get('skill') == skill]
        if not skill_questions:
            continue

        # Prefer lower difficulty items; break ties with calibrated difficulty score
        sorted_candidates = sorted(
            skill_questions,
            key=lambda q: (
                difficulty_rank.get(q.get('difficulty', 'beginner').lower(), 1),
                get_question_difficulty_score(q, question_stats)
            )
        )
        candidate = sorted_candidates[0]
        candidate_copy = dict(candidate)
        candidate_copy['difficulty_score'] = round(
            get_question_difficulty_score(candidate, question_stats), 2
        )
        questions.append(candidate_copy)

    return questions


def get_question_difficulty_score(question, question_stats):
    """Combine static difficulty with global performance to produce a score [0,1]."""
    base_difficulty_map = {
        'beginner': 0.35,
        'intermediate': 0.6,
        'advanced': 0.85
    }

    stats = question_stats.get(str(question.get('id')), {})
    attempts = stats.get('attempts', 0)
    correct = stats.get('correct', 0)
    global_accuracy = (correct / attempts) if attempts else 0.7

    base_score = base_difficulty_map.get(question.get('difficulty', 'beginner'), 0.5)

    # If lots of students miss the question, increase difficulty; if most get it right, reduce it.
    difficulty_shift = (0.7 - global_accuracy) * 0.4
    adjusted_score = clamp(base_score + difficulty_shift, 0.05, 0.95)
    return adjusted_score


def predict_success_probability(student_skill_score, question_difficulty_score):
    """Predict success probability using a logistic curve over the skill-gap."""
    gap = student_skill_score - question_difficulty_score
    return clamp(1 / (1 + math.exp(-5 * gap)))

def update_metrics(student_data, student_id, question_id, skill, is_correct, time_spent, hints_used=0, lesson=None):
    """Update student metrics after answering a question."""
    student = student_data[student_id]

    if 'metrics' not in student:
        student['metrics'] = {
            'total_questions_answered': 0,
            'correct_answers': 0,
            'incorrect_answers': 0,
            'average_time_per_question': 0,
            'skill_performance': {}
        }

    # Initialize question history if it doesn't exist
    if 'question_history' not in student:
        student['question_history'] = []

    # Add detailed question record
    question_record = {
        'question_id': question_id,
        'skill': skill,
        'lesson': lesson,
        'is_correct': is_correct,
        'time_spent': round(time_spent, 1),
        'hints_used': hints_used,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'session_id': len(student['question_history']) + 1
    }
    student['question_history'].append(question_record)

    metrics = student['metrics']

    # Update overall metrics
    metrics['total_questions_answered'] += 1
    if is_correct:
        metrics['correct_answers'] += 1
    else:
        metrics['incorrect_answers'] += 1

    # Update average time
    total_time = metrics['average_time_per_question'] * (metrics['total_questions_answered'] - 1) + time_spent
    metrics['average_time_per_question'] = total_time / metrics['total_questions_answered']

    # Update skill-specific metrics
    if skill not in metrics['skill_performance']:
        metrics['skill_performance'][skill] = {
            'questions_answered': 0,
            'correct': 0,
            'incorrect': 0,
            'average_time': 0,
            'struggling_areas': []
        }

    skill_metrics = metrics['skill_performance'][skill]
    skill_metrics['questions_answered'] += 1
    if is_correct:
        skill_metrics['correct'] += 1
    else:
        skill_metrics['incorrect'] += 1

    # Update skill average time
    total_skill_time = skill_metrics['average_time'] * (skill_metrics['questions_answered'] - 1) + time_spent
    skill_metrics['average_time'] = total_skill_time / skill_metrics['questions_answered']

def get_all_skills(domain_data=None):
    """Return full list of skills, combining defaults with any custom additions."""
    if domain_data is None:
        domain_data = read_json_file(DOMAIN_FILE)

    skills = domain_data.get('skills', DEFAULT_SKILLS)
    return sorted(list(set(skills + DEFAULT_SKILLS)))


def create_new_student_profile(username, password, role="student"):
    """Create a fresh student profile with default values."""
    domain_data = read_json_file(DOMAIN_FILE)
    skills = get_all_skills(domain_data)

    mastery = {skill: 0.0 for skill in skills}

    return {
        "username": username,
        "password_hash": generate_password_hash(password),
        "role": role,
        "name": username.capitalize(),
        "email": f"{username}@example.com",
        "level": 1,
        "language_prefs": {
            "learn": "english",
            "ui": "english"
        },
        "mastery": mastery,
        "metrics": {
            "total_questions_answered": 0,
            "correct_answers": 0,
            "incorrect_answers": 0,
            "average_time_per_question": 0,
            "skill_performance": {}
        },
        "badges": [],
        "question_history": [],
        "current_session": {
            "question_id": None,
            "hints_used": 0,
            "start_time": None
        },
        "diagnostic_complete": False
    }

def check_badge_eligibility(student_data, student_id):
    """Check if student earned any new badges."""
    student = student_data[student_id]
    current_badges = [badge['id'] for badge in student.get('badges', [])]
    new_badges = []

    metrics = student.get('metrics', {})
    mastery = student.get('mastery', {})

    # First lesson badge
    if 'first_lesson' not in current_badges and metrics.get('total_questions_answered', 0) >= 1:
        new_badges.append({
            'id': 'first_lesson',
            'name': 'First Steps',
            'description': 'Completed your first lesson!',
            'icon': '🌟',
            'earned_date': datetime.now().strftime('%Y-%m-%d')
        })

    # Speed demon badge
    if 'speed_demon' not in current_badges and metrics.get('average_time_per_question', 0) < 15:
        new_badges.append({
            'id': 'speed_demon',
            'name': 'Speed Demon',
            'description': 'Average answer time under 15 seconds!',
            'icon': '⚡',
            'earned_date': datetime.now().strftime('%Y-%m-%d')
        })

    # Skill mastery badges
    for skill, score in mastery.items():
        badge_id = f"{skill}_master"
        if badge_id not in current_badges and score >= 1.0:
            skill_name = skill.replace('_', ' ').title()
            new_badges.append({
                'id': badge_id,
                'name': f'{skill_name} Master',
                'description': f'Mastered all {skill_name} skills!',
                'icon': '🏆',
                'earned_date': datetime.now().strftime('%Y-%m-%d')
            })

    # Add new badges to student
    if new_badges:
        if 'badges' not in student:
            student['badges'] = []
        student['badges'].extend(new_badges)

    return new_badges

# --- API Endpoints ---

@app.route('/api/register', methods=['POST'])
def register():
    """Register a new student or admin."""
    username = request.json.get('username')
    password = request.json.get('password')
    role = request.json.get('role', 'student')
    admin_code = request.json.get('admin_code')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if role not in ["student", "admin"]:
        return jsonify({"error": "Invalid role selected"}), 400

    if role == "admin" and admin_code != ADMIN_ACCESS_CODE:
        return jsonify({"error": "Invalid admin access code"}), 403

    student_data = read_json_file(STUDENT_FILE)

    # Check if username already exists
    if username in student_data:
        return jsonify({"error": "Username already exists"}), 400

    # Create new profile
    student_data[username] = create_new_student_profile(username, password, role)
    write_json_file(STUDENT_FILE, student_data)

    return jsonify({
        "success": True,
        "message": "Registration successful",
        "student_id": username,
        "role": role,
        "diagnostic_complete": False
    })

@app.route('/api/login', methods=['POST'])
def login():
    """Login a student."""
    username = request.json.get('username')
    password = request.json.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    student_data = read_json_file(STUDENT_FILE)

    if username not in student_data:
        return jsonify({"error": "Invalid username or password"}), 401

    student = student_data[username]

    if 'password_hash' not in student or not check_password_hash(student['password_hash'], password):
        return jsonify({"error": "Invalid username or password"}), 401

    return jsonify({
        "success": True,
        "student_id": username,
        "role": student.get('role', 'student'),
        "diagnostic_complete": student.get('diagnostic_complete', False)
    })
@app.route('/api/get-question', methods=['POST'])
def get_question():
    """Get next question based on student's mastery and level."""
    student_id = request.json.get('student_id', 'student_alex')
    requested_skill = request.json.get('skill')
    requested_lesson = request.json.get('lesson')
    student_data = read_json_file(STUDENT_FILE)
    domain_data = read_json_file(DOMAIN_FILE)
    ensure_lessons(domain_data)
    question_stats = get_question_stats(domain_data)

    # Create new student if doesn't exist
    if student_id not in student_data:
        student_data[student_id] = create_new_student_profile(student_id, "password123") # Default password for new auto-created students
        write_json_file(STUDENT_FILE, student_data)

    student = student_data[student_id]
    mastery = student['mastery']
    student_level = student.get('level', 1)

    # Find unmastered skills (mastery < 1.0)
    unmastered_skills = [skill for skill, score in mastery.items() if score < 1.0]

    if not unmastered_skills:
        return jsonify({
            "question": "You have mastered all skills! Great job!",
            "id": None,
            "skill": None
        })

    # Pick a skill to teach based on performance metrics unless a specific one was requested
    if requested_skill and requested_skill in mastery:
        skill_to_teach = requested_skill
    else:
        skill_to_teach = choose_skill_based_on_metrics(student, unmastered_skills)

    # Find questions for that skill and level
    all_questions = domain_data.get('questions', [])
    skill_questions = [q for q in all_questions
                      if q['skill'] == skill_to_teach and q.get('level', 1) <= student_level]

    if requested_lesson:
        skill_questions = [q for q in skill_questions if q.get('lesson') == requested_lesson]

    if not skill_questions:
        return jsonify({
            "error": f"No questions found for skill: {skill_to_teach}",
            "lesson": requested_lesson,
            "skill": skill_to_teach,
            "debug": {
                "total_questions": len(all_questions),
                "skill_questions_before_filter": len([q for q in all_questions if q['skill'] == skill_to_teach]),
                "requested_lesson": requested_lesson
            }
        }), 404

    # ML-inspired selection: choose the question whose predicted success probability is nearest to 70%
    student_skill_score = student['mastery'].get(skill_to_teach, 0.0)
    target_probability = 0.7
    scored_questions = []

    for question in skill_questions:
        difficulty_score = get_question_difficulty_score(question, question_stats)
        predicted_probability = predict_success_probability(student_skill_score, difficulty_score)
        scored_questions.append({
            'question': question,
            'predicted_probability': predicted_probability,
            'difficulty_score': difficulty_score,
            'distance_to_target': abs(predicted_probability - target_probability)
        })

    if not scored_questions:
        return jsonify({"error": "No questions available after scoring"}), 500

    # Choose the closest to the target probability; break ties randomly
    scored_questions.sort(key=lambda q: q['distance_to_target'])
    best_distance = scored_questions[0]['distance_to_target']
    best_candidates = [q for q in scored_questions if abs(q['distance_to_target'] - best_distance) < 1e-6]
    chosen = random.choice(best_candidates)
    question_to_send = {
        **chosen['question'],
        'predicted_success_probability': round(chosen['predicted_probability'], 2),
        'question_difficulty_score': round(chosen['difficulty_score'], 2)
    }

    # Track session start
    student_data[student_id]['current_session'] = {
        'question_id': question_to_send['id'],
        'hints_used': 0,
        'start_time': time.time(),
        'lesson': question_to_send.get('lesson')
    }
    write_json_file(STUDENT_FILE, student_data)

    return jsonify(question_to_send)

@app.route('/api/submit-answer', methods=['POST'])
def submit_answer():
    """Update student's mastery score and metrics."""
    student_id = request.json.get('student_id', 'student_alex')
    is_correct = request.json.get('is_correct', False)
    skill = request.json.get('skill')
    question_id = request.json.get('question_id')
    lesson = request.json.get('lesson')

    if not skill:
        return jsonify({"error": "No skill provided"}), 400

    student_data = read_json_file(STUDENT_FILE)
    domain_data = read_json_file(DOMAIN_FILE)
    ensure_lessons(domain_data)

    # Create new student if doesn't exist
    if student_id not in student_data:
        student_data[student_id] = create_new_student_profile(student_id, "password123") # Default password for new auto-created students
        write_json_file(STUDENT_FILE, student_data)

    student = student_data[student_id]

    # Calculate time spent
    session = student.get('current_session', {})
    start_time = session.get('start_time', time.time())
    time_spent = time.time() - start_time
    hints_used = session.get('hints_used', 0)

    # Derive lesson from the domain data if it wasn't provided by the client
    if not lesson and question_id:
        for question in domain_data.get('questions', []):
            if question.get('id') == question_id:
                lesson = question.get('lesson')
                break

    # Update mastery: +0.25 if correct, -0.1 if wrong
    if is_correct:
        new_score = student['mastery'][skill] + 0.25
    else:
        new_score = student['mastery'][skill] - 0.1

    student['mastery'][skill] = max(0.0, min(1.0, new_score))

    # Update metrics with hints used
    update_metrics(student_data, student_id, question_id, skill, is_correct, time_spent, hints_used, lesson)

    # Update global question stats for difficulty calibration
    question_stats = get_question_stats(domain_data)
    stats_entry = question_stats.setdefault(str(question_id), {
        'attempts': 0,
        'correct': 0,
        'incorrect': 0
    })
    stats_entry['attempts'] += 1
    if is_correct:
        stats_entry['correct'] += 1
    else:
        stats_entry['incorrect'] += 1

    # Check for new badges
    new_badges = check_badge_eligibility(student_data, student_id)

    # Reset session
    student['current_session'] = {
        'question_id': None,
        'hints_used': 0,
        'start_time': None
    }

    write_json_file(STUDENT_FILE, student_data)
    write_json_file(DOMAIN_FILE, domain_data)

    return jsonify({
        "success": True,
        "new_mastery": student['mastery'],
        "new_badges": new_badges,
        "time_spent": round(time_spent, 1)
    })

@app.route('/api/get-progress', methods=['POST'])
def get_progress():
    """Get student's mastery data."""
    student_id = request.json.get('student_id', 'student_alex')
    student_data = read_json_file(STUDENT_FILE)

    if student_id not in student_data:
        return jsonify({"error": "Student not found"}), 404

    return jsonify(student_data[student_id]['mastery'])

@app.route('/api/update-profile', methods=['POST'])
def update_profile():
    """Update student profile."""
    student_id = request.json.get('student_id', 'student_alex')
    name = request.json.get('name')
    email = request.json.get('email')

    student_data = read_json_file(STUDENT_FILE)
    if student_id not in student_data:
        return jsonify({"error": "Student not found"}), 404

    student_data[student_id]['name'] = name
    student_data[student_id]['email'] = email
    write_json_file(STUDENT_FILE, student_data)

    return jsonify({"success": True, "message": "Profile updated!"})

@app.route('/api/update-password', methods=['POST'])
def update_password():
    """Update student password."""
    student_id = request.json.get('student_id')
    password = request.json.get('password')

    if not password or len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    student_data = read_json_file(STUDENT_FILE)
    if student_id not in student_data:
        return jsonify({"error": "Student not found"}), 404

    student_data[student_id]['password_hash'] = generate_password_hash(password)
    write_json_file(STUDENT_FILE, student_data)

    return jsonify({"success": True, "message": "Password updated successfully!"})

@app.route('/api/update-language', methods=['POST'])
def update_language():
    """Update language preferences."""
    student_id = request.json.get('student_id', 'student_alex')
    learn_lang = request.json.get('learn_lang')
    ui_lang = request.json.get('ui_lang')

    student_data = read_json_file(STUDENT_FILE)
    if student_id not in student_data:
        return jsonify({"error": "Student not found"}), 404

    student_data[student_id]['language_prefs'] = {
        "learn": learn_lang,
        "ui": ui_lang
    }
    write_json_file(DOMAIN_FILE, domain_data)
    return jsonify({"success": True, "message": "Language preferences updated!"})


@app.route('/api/admin/delete-skill', methods=['POST'])
def delete_skill():
    """Delete an entire skill and its lessons/questions."""
    skill = request.json.get('skill')
    if not skill:
        return jsonify({"error": "Skill name is required"}), 400

    domain_data = read_json_file(DOMAIN_FILE)

    # Remove from skills list
    if 'skills' in domain_data and skill in domain_data['skills']:
        domain_data['skills'].remove(skill)

    # Remove lessons
    lessons = domain_data.get('lessons', {})
    if skill in lessons:
        del lessons[skill]

    # Remove questions
    questions = domain_data.get('questions', [])
    domain_data['questions'] = [q for q in questions if q.get('skill') != skill]

    write_json_file(DOMAIN_FILE, domain_data)
    return jsonify({"success": True, "message": f"Skill '{skill}' deleted successfully"})


@app.route('/api/admin/delete-lesson', methods=['POST'])
def delete_lesson():
    """Delete a specific lesson and its associated questions."""
    skill = request.json.get('skill')
    lesson_id = request.json.get('lesson_id')

    if not skill or not lesson_id:
        return jsonify({"error": "Skill and Lesson ID are required"}), 400

    domain_data = read_json_file(DOMAIN_FILE)

    # Remove lesson
    lessons = domain_data.get('lessons', {})
    if skill in lessons:
        lessons[skill] = [l for l in lessons[skill] if l.get('id') != lesson_id]
        # If it was the last lesson, add a placeholder or keep empty
        if not lessons[skill]:
            del lessons[skill]

    # Remove questions linked to this lesson
    questions = domain_data.get('questions', [])
    domain_data['questions'] = [q for q in questions if q.get('lesson') != lesson_id]

    write_json_file(DOMAIN_FILE, domain_data)
    return jsonify({"success": True, "message": f"Lesson '{lesson_id}' deleted successfully"})


@app.route('/api/skills', methods=['GET'])
def list_skills():
    """Return the list of available skills."""
    domain_data = read_json_file(DOMAIN_FILE)
    ensure_lessons(domain_data)
    write_json_file(DOMAIN_FILE, domain_data)
    return jsonify(get_all_skills(domain_data))


@app.route('/api/skill-lessons', methods=['GET'])
def list_skill_lessons():
    """Return skills with their lessons for navigation/admin selection."""
    domain_data = read_json_file(DOMAIN_FILE)
    lessons = ensure_lessons(domain_data)
    write_json_file(DOMAIN_FILE, domain_data)

    payload = []
    for skill in get_all_skills(domain_data):
        payload.append({
            'skill': skill,
            'lessons': lessons.get(skill, [])
        })
    return jsonify(payload)


@app.route('/api/admin/add-skill', methods=['POST'])
def add_skill():
    """Add a new skill to the system and propagate it to all students."""
    raw_skill = request.json.get('skill', '')

    normalized_skill = slugify_label(raw_skill)
    if not normalized_skill:
        return jsonify({"error": "Skill name is required"}), 400

    domain_data = read_json_file(DOMAIN_FILE)
    student_data = read_json_file(STUDENT_FILE)

    current_skills = get_all_skills(domain_data)
    if normalized_skill in current_skills:
        return jsonify({"error": "Skill already exists"}), 400

    updated_skills = sorted(list(set(current_skills + [normalized_skill])))
    domain_data['skills'] = updated_skills
    ensure_lessons(domain_data)

    # Add mastery slots for all students
    for student in student_data.values():
        mastery = student.setdefault('mastery', {})
        metrics = student.setdefault('metrics', {})
        skill_performance = metrics.setdefault('skill_performance', {})

        mastery[normalized_skill] = mastery.get(normalized_skill, 0.0)
        skill_performance.setdefault(normalized_skill, {
            'questions_answered': 0,
            'correct': 0,
            'incorrect': 0,
            'average_time': 0,
            'struggling_areas': []
        })

    write_json_file(DOMAIN_FILE, domain_data)
    write_json_file(STUDENT_FILE, student_data)

    return jsonify({"success": True, "skill": normalized_skill})


@app.route('/api/admin/add-lesson', methods=['POST'])
def add_lesson():
    """Add a lesson under an existing skill."""
    skill = slugify_label(request.json.get('skill', ''))
    lesson_title = request.json.get('title', '').strip()
    description = request.json.get('description', '').strip()
    content = request.json.get('content', '').strip()

    if not skill or not lesson_title:
        return jsonify({"error": "Skill and lesson title are required"}), 400

    domain_data = read_json_file(DOMAIN_FILE)
    current_skills = get_all_skills(domain_data)
    if skill not in current_skills:
        return jsonify({"error": f"Skill '{skill}' does not exist"}), 400

    lessons = ensure_lessons(domain_data)
    skill_lessons = lessons.setdefault(skill, [])
    lesson_id = slugify_label(f"{skill}_{len(skill_lessons) + 1}")

    new_lesson = {
        'id': lesson_id,
        'title': lesson_title,
        'description': description or 'Lesson added by admin.',
        'content': content or 'No content provided.'
    }
    skill_lessons.append(new_lesson)

    domain_data['lessons'] = lessons
    write_json_file(DOMAIN_FILE, domain_data)

    return jsonify({"success": True, "lesson": new_lesson})


@app.route('/api/admin/users', methods=['GET'])
def list_users_for_admin():
    """Return a lightweight list of all users for admin oversight."""
    student_data = read_json_file(STUDENT_FILE)

    users = []
    for username, data in student_data.items():
        users.append({
            "username": username,
            "role": data.get('role', 'student'),
            "email": data.get('email'),
            "name": data.get('name'),
            "level": data.get('level', 1)
        })

    return jsonify(sorted(users, key=lambda u: u['username']))


@app.route('/api/diagnostic/start', methods=['POST'])
def start_diagnostic():
    """Serve a lightweight baseline quiz across skills for new sessions."""
    student_id = request.json.get('student_id', 'student_alex')

    student_data = read_json_file(STUDENT_FILE)
    domain_data = read_json_file(DOMAIN_FILE)
    ensure_lessons(domain_data)

    # Auto-provision student if missing
    if student_id not in student_data:
        student_data[student_id] = create_new_student_profile(student_id, "password123")
        write_json_file(STUDENT_FILE, student_data)

    questions = build_diagnostic_questions(domain_data)
    return jsonify({
        'questions': questions,
        'count': len(questions)
    })


@app.route('/api/diagnostic/submit', methods=['POST'])
def submit_diagnostic():
    """Update mastery based on diagnostic responses and recommend lessons."""
    student_id = request.json.get('student_id', 'student_alex')
    responses = request.json.get('responses', [])

    student_data = read_json_file(STUDENT_FILE)
    domain_data = read_json_file(DOMAIN_FILE)
    lessons = ensure_lessons(domain_data)

    if student_id not in student_data:
        student_data[student_id] = create_new_student_profile(student_id, "password123")

    student = student_data[student_id]
    mastery_updates = {}
    skill_summary = {}

    # Aggregate response accuracy per skill
    for entry in responses:
        skill = entry.get('skill')
        is_correct = entry.get('is_correct', False)
        question_id = entry.get('question_id')
        lesson = entry.get('lesson')

        if not skill:
            continue

        summary = skill_summary.setdefault(skill, {'attempts': 0, 'correct': 0})
        summary['attempts'] += 1
        if is_correct:
            summary['correct'] += 1

        # Log to metrics for transparency/history
        update_metrics(student_data, student_id, question_id, skill, is_correct, time_spent=5, hints_used=0, lesson=lesson)

    # Derive mastery adjustments and recommendations
    for skill, summary in skill_summary.items():
        ratio = summary['correct'] / summary['attempts'] if summary['attempts'] else 0
        mastery_score = clamp(0.3 + 0.7 * ratio)
        student['mastery'][skill] = mastery_score
        mastery_updates[skill] = mastery_score

    # Recommend lessons for the lowest-confidence skills
    recommended_lessons = []
    for skill, score in sorted(mastery_updates.items(), key=lambda x: x[1]):
        if score >= 0.75:
            continue
        lesson_list = lessons.get(skill, [])
        if not lesson_list:
            continue
        recommended_lessons.append({
            'skill': skill,
            'lesson': lesson_list[0]
        })

    write_json_file(STUDENT_FILE, student_data)
    write_json_file(DOMAIN_FILE, domain_data)

    # Mark diagnostic as complete
    student['diagnostic_complete'] = True
    write_json_file(STUDENT_FILE, student_data)
    write_json_file(DOMAIN_FILE, domain_data)

    return jsonify({
        'mastery_updates': mastery_updates,
        'recommended_lessons': recommended_lessons
    })


@app.route('/api/admin/delete-user', methods=['POST'])
def delete_user_account():
    """Delete a user account (admin functionality)."""
    username = request.json.get('username')

    if not username:
        return jsonify({"error": "Username is required"}), 400

    # First attempt to delete from the database
    db_success = db_delete_student(username)

    # Also check if it exists in the local JSON structure for compatibility
    student_data = read_json_file(STUDENT_FILE)
    json_exists = username in student_data

    if json_exists:
        del student_data[username]
        write_json_file(STUDENT_FILE, student_data)

    if not db_success and not json_exists:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"success": True, "message": f"User '{username}' deleted successfully"})


@app.route('/api/admin/create-badge', methods=['POST'])
def create_custom_badge():
    """Create a custom badge (admin functionality)."""
    badge_id = request.json.get('badge_id')
    name = request.json.get('name')
    description = request.json.get('description')
    icon = request.json.get('icon', '🏆')
    criteria = request.json.get('criteria', {})

    if not badge_id or not name or not description:
        return jsonify({"error": "badge_id, name, and description are required"}), 400

    domain_data = read_json_file(DOMAIN_FILE)

    # Initialize custom_badges if it doesn't exist
    if 'custom_badges' not in domain_data:
        domain_data['custom_badges'] = []

    # Check if badge already exists
    if any(b['id'] == badge_id for b in domain_data['custom_badges']):
        return jsonify({"error": "Badge with this ID already exists"}), 400

    new_badge = {
        'id': badge_id,
        'name': name,
        'description': description,
        'icon': icon,
        'criteria': criteria,
        'custom': True
    }

    domain_data['custom_badges'].append(new_badge)
    write_json_file(DOMAIN_FILE, domain_data)

    return jsonify({"success": True, "badge": new_badge})


@app.route('/api/admin/update-lesson-image', methods=['POST'])
def update_lesson_image():
    """Add or update image in a lesson (admin functionality)."""
    skill = request.json.get('skill')
    lesson_id = request.json.get('lesson_id')
    image_url = request.json.get('image_url')
    image_position = request.json.get('position', 'header')  # header, inline, footer

    if not skill or not lesson_id or not image_url:
        return jsonify({"error": "skill, lesson_id, and image_url are required"}), 400

    domain_data = read_json_file(DOMAIN_FILE)
    lessons = domain_data.get('lessons', {})

    if skill not in lessons:
        return jsonify({"error": f"Skill '{skill}' not found"}), 404

    lesson = next((l for l in lessons[skill] if l['id'] == lesson_id), None)
    if not lesson:
        return jsonify({"error": f"Lesson '{lesson_id}' not found"}), 404

    # Add image to lesson content based on position
    image_markdown = f"\n\n![Lesson Image]({image_url})\n\n"

    if image_position == 'header':
        lesson['content'] = image_markdown + lesson['content']
    elif image_position == 'footer':
        lesson['content'] = lesson['content'] + image_markdown
    else:  # inline
        # Add in the middle
        lines = lesson['content'].split('\n')
        mid = len(lines) // 2
        lines.insert(mid, image_markdown)
        lesson['content'] = '\n'.join(lines)

    write_json_file(DOMAIN_FILE, domain_data)

    return jsonify({"success": True, "lesson": lesson})


@app.route('/api/admin/update-question-image', methods=['POST'])
def update_question_image():
    """Add image to a question (admin functionality)."""
    question_id = request.json.get('question_id')
    image_url = request.json.get('image_url')

    if not question_id or not image_url:
        return jsonify({"error": "question_id and image_url are required"}), 400

    domain_data = read_json_file(DOMAIN_FILE)
    questions = domain_data.get('questions', [])

    question = next((q for q in questions if q['id'] == question_id), None)
    if not question:
        return jsonify({"error": "Question not found"}), 404

    # Add image URL to question
    question['image_url'] = image_url

    write_json_file(DOMAIN_FILE, domain_data)

    return jsonify({"success": True, "question": question})

@app.route('/api/add-question', methods=['POST'])
def add_question():
    """Add new question (Admin functionality)."""
    data = request.json
    question = data.get('question')
    answer = data.get('answer')
    skill = data.get('skill')
    lesson = data.get('lesson')

    if not all([question, answer, skill]):
        return jsonify({"error": "Missing data"}), 400

    domain_data = read_json_file(DOMAIN_FILE)
    available_skills = get_all_skills(domain_data)
    if skill not in available_skills:
        return jsonify({"error": f"Skill '{skill}' is not recognized. Add it as a skill first."}), 400
    lessons = ensure_lessons(domain_data)
    skill_lessons = lessons.get(skill, [])

    if not lesson and skill_lessons:
        lesson = skill_lessons[0]['id']
    elif lesson and not any(l['id'] == lesson for l in skill_lessons):
        return jsonify({"error": f"Lesson '{lesson}' is not recognized for skill '{skill}'"}), 400
    all_questions = domain_data.get('questions', [])

    new_id = max([q['id'] for q in all_questions] or [0]) + 1

    new_question = {
        "id": new_id,
        "skill": skill,
        "level": 1,
        "question": question,
        "answer": answer,
        "lesson": lesson,
        "hints": [
            "Think about the key concepts in this question",
            "Consider what you know about this topic",
            "Break down the question into smaller parts"
        ],
        "type": "custom_question",
        "difficulty": "beginner"
    }

    all_questions.append(new_question)
    domain_data['questions'] = all_questions

    write_json_file(DOMAIN_FILE, domain_data)

    return jsonify({"success": True, "new_question": new_question})

@app.route('/api/delete-question', methods=['POST'])
def delete_question():
    """Delete question (Admin functionality)."""
    data = request.json
    question_id = data.get('question_id')

    if not question_id:
        return jsonify({"error": "Question ID required"}), 400

    domain_data = read_json_file(DOMAIN_FILE)
    all_questions = domain_data.get('questions', [])

    # Find and remove the question
    original_count = len(all_questions)
    all_questions = [q for q in all_questions if q['id'] != question_id]

    if len(all_questions) == original_count:
        return jsonify({"error": "Question not found"}), 404

    domain_data['questions'] = all_questions
    write_json_file(DOMAIN_FILE, domain_data)

    return jsonify({"success": True, "message": "Question deleted successfully"})

@app.route('/api/get-all-questions', methods=['GET'])
def get_all_questions():
    """Get all questions for admin management."""
    domain_data = read_json_file(DOMAIN_FILE)
    return jsonify(domain_data.get('questions', []))

@app.route('/api/student-data', methods=['GET'])
def get_student_data():
    """Get complete student data for frontend."""
    student_data = read_json_file(STUDENT_FILE)
    student_id = request.json.get('student_id', 'student_alex')
    return jsonify(student_data.get(student_id, {}))

@app.route('/api/get-hint', methods=['POST'])
def get_hint():
    """Get hint for current question."""
    student_id = request.json.get('student_id', 'student_alex')
    question_id = request.json.get('question_id')

    student_data = read_json_file(STUDENT_FILE)
    domain_data = read_json_file(DOMAIN_FILE)

    if student_id not in student_data:
        return jsonify({"error": "Student not found"}), 404

    student = student_data[student_id]
    session = student.get('current_session', {})
    hints_used = session.get('hints_used', 0)

    # Find the question
    question = next((q for q in domain_data['questions'] if q['id'] == question_id), None)
    if not question:
        return jsonify({"error": "Question not found"}), 404

    hints = question.get('hints', [])

    if hints_used >= len(hints):
        # Give answer after 3 hints
        if hints_used >= 3:
            return jsonify({
                "hint": f"The answer is: {question['answer']}",
                "is_answer": True,
                "hints_used": hints_used + 1
            })
        else:
            return jsonify({"error": "No more hints available"}), 400

    hint = hints[hints_used]

    # Update hints used
    student['current_session']['hints_used'] = hints_used + 1
    write_json_file(STUDENT_FILE, student_data)

    return jsonify({
        "hint": hint,
        "is_answer": False,
        "hints_used": hints_used + 1
    })

@app.route('/api/get-badges', methods=['POST'])
def get_badges():
    """Get student's badges and available badges."""
    student_id = request.json.get('student_id', 'student_alex')
    student_data = read_json_file(STUDENT_FILE)

    if student_id not in student_data:
        return jsonify({"error": "Student not found"}), 404

    student = student_data[student_id]
    earned_badges = student.get('badges', [])

    # Define all possible badges
    all_badges = [
        {
            'id': 'first_lesson',
            'name': 'First Steps',
            'description': 'Complete your first lesson!',
            'icon': '🌟'
        },
        {
            'id': 'speed_demon',
            'name': 'Speed Demon',
            'description': 'Average answer time under 15 seconds!',
            'icon': '⚡'
        },
        {
            'id': 'vocabulary_master',
            'name': 'Vocabulary Master',
            'description': 'Master all Vocabulary skills!',
            'icon': '📚'
        },
        {
            'id': 'grammar_master',
            'name': 'Grammar Master',
            'description': 'Master all Grammar skills!',
            'icon': '✏️'
        },
        {
            'id': 'reading_comprehension_master',
            'name': 'Reading Master',
            'description': 'Master all Reading Comprehension skills!',
            'icon': '📖'
        },
        {
            'id': 'spelling_master',
            'name': 'Spelling Master',
            'description': 'Master all Spelling skills!',
            'icon': '🔤'
        },
        {
            'id': 'writing_master',
            'name': 'Writing Master',
            'description': 'Master all Writing skills!',
            'icon': '✍️'
        }
    ]

    earned_ids = [badge['id'] for badge in earned_badges]
    available_badges = [badge for badge in all_badges if badge['id'] not in earned_ids]

    return jsonify({
        "earned_badges": earned_badges,
        "available_badges": available_badges
    })

@app.route('/api/get-metrics', methods=['POST'])
def get_metrics():
    """Get student's performance metrics."""
    student_id = request.json.get('student_id', 'student_alex')
    student_data = read_json_file(STUDENT_FILE)

    # Create new student if doesn't exist
    if student_id not in student_data:
        student_data[student_id] = create_new_student_profile(student_id, "password123") # Default password for new auto-created students
        write_json_file(STUDENT_FILE, student_data)

    student = student_data[student_id]
    metrics = student.get('metrics', {})
    mastery = student.get('mastery', {})

    # Calculate recommended questions
    struggling_skills = []
    for skill, performance in metrics.get('skill_performance', {}).items():
        if performance.get('struggling_areas') or (performance.get('correct', 0) / max(performance.get('questions_answered', 1), 1)) < 0.7:
            struggling_skills.append(skill)

    return jsonify({
        "metrics": metrics,
        "mastery": mastery,
        "recommended_skills": struggling_skills,
        "level": student.get('level', 1)
    })

@app.route('/api/reset-progress', methods=['POST'])
def reset_progress():
    """Reset student's progress (for testing/new users)."""
    student_id = request.json.get('student_id', 'student_alex')
    student_data = read_json_file(STUDENT_FILE)

    # Reset to fresh profile
    # Preserve password and basic info, just reset progress
    if student_id in student_data:
        current_password_hash = student_data[student_id].get('password_hash')
        current_email = student_data[student_id].get('email')
        current_name = student_data[student_id].get('name')

        # Reset to fresh profile
        new_profile = create_new_student_profile(student_id, "dummy")
        new_profile['password_hash'] = current_password_hash
        new_profile['email'] = current_email
        new_profile['name'] = current_name

        student_data[student_id] = new_profile
    else:
        student_data[student_id] = create_new_student_profile(student_id, "password123")

    write_json_file(STUDENT_FILE, student_data)

    return jsonify({
        "success": True,
        "message": "Progress reset successfully!",
        "student_data": student_data[student_id]
    })

@app.route('/api/create-student', methods=['POST'])
def create_student():
    """Create a new student profile."""
    student_id = request.json.get('student_id')
    name = request.json.get('name', 'New Student')

    if not student_id:
        return jsonify({"error": "Student ID required"}), 400

    student_data = read_json_file(STUDENT_FILE)

    # Create new profile
    new_profile = create_new_student_profile(student_id, "password123")
    new_profile['name'] = name
    student_data[student_id] = new_profile

    write_json_file(STUDENT_FILE, student_data)

    return jsonify({
        "success": True,
        "message": f"Student {student_id} created successfully!",
        "student_data": new_profile
    })

@app.route('/api/get-question-history', methods=['POST'])
def get_question_history():
    """Get detailed question history for a student."""
    student_id = request.json.get('student_id', 'student_alex')
    limit = request.json.get('limit', 50)  # Default to last 50 questions

    student_data = read_json_file(STUDENT_FILE)
    domain_data = read_json_file(DOMAIN_FILE)

    if student_id not in student_data:
        return jsonify({"error": "Student not found"}), 404

    student = student_data[student_id]
    history = student.get('question_history', [])

    # Get the most recent questions (limited)
    recent_history = history[-limit:] if len(history) > limit else history

    # Enrich history with question details
    enriched_history = []
    for record in recent_history:
        question_id = record['question_id']
        question_data = next((q for q in domain_data['questions'] if q['id'] == question_id), None)

        enriched_record = {
            **record,
            'question_text': question_data['question'] if question_data else 'Question not found',
            'correct_answer': question_data['answer'] if question_data else 'N/A'
        }
        enriched_history.append(enriched_record)

    return jsonify({
        "history": enriched_history,
        "total_questions": len(history),
        "showing": len(recent_history)
    })

@app.route('/api/retry-question', methods=['POST'])
def retry_question():
    """Get a specific question for retry."""
    question_id = request.json.get('question_id')

    if not question_id:
        return jsonify({"error": "Question ID required"}), 400

    domain_data = read_json_file(DOMAIN_FILE)
    question = next((q for q in domain_data['questions'] if q['id'] == question_id), None)

    if not question:
        return jsonify({"error": "Question not found"}), 404

    return jsonify(question)

@app.route('/api/get-session-summary', methods=['POST'])
def get_session_summary():
    """Get summary of recent session performance."""
    student_id = request.json.get('student_id', 'student_alex')
    session_size = request.json.get('session_size', 10)  # Last 10 questions

    student_data = read_json_file(STUDENT_FILE)

    if student_id not in student_data:
        return jsonify({"error": "Student not found"}), 404

    student = student_data[student_id]
    history = student.get('question_history', [])

    if len(history) < session_size:
        session_questions = history
    else:
        session_questions = history[-session_size:]

    if not session_questions:
        return jsonify({
            "session_summary": {
                "total_questions": 0,
                "correct_answers": 0,
                "accuracy": 0,
                "average_time": 0,
                "total_hints_used": 0,
                "skills_practiced": []
            }
        })

    # Calculate session statistics
    correct_count = sum(1 for q in session_questions if q['is_correct'])
    total_time = sum(q['time_spent'] for q in session_questions)
    total_hints = sum(q['hints_used'] for q in session_questions)
    skills_practiced = list(set(q['skill'] for q in session_questions))

    return jsonify({
        "session_summary": {
            "total_questions": len(session_questions),
            "correct_answers": correct_count,
            "accuracy": round((correct_count / len(session_questions)) * 100, 1),
            "average_time": round(total_time / len(session_questions), 1),
            "total_hints_used": total_hints,
            "skills_practiced": skills_practiced
        },
        "questions": session_questions
    })


# ============================================
# AI-POWERED LESSON GENERATION ENDPOINTS
# ============================================

@app.route('/api/ai/status', methods=['GET'])
def ai_status():
    """Check if AI features are available."""
    return jsonify({
        "ai_enabled": AI_ENABLED,
        "features": ["lesson_generation", "question_generation", "personalized_practice"] if AI_ENABLED else []
    })


@app.route('/api/ai/generate-lesson', methods=['POST'])
def ai_generate_lesson():
    """Generate a new lesson using AI."""
    if not AI_ENABLED:
        return jsonify({"error": "AI features not available. Check GEMINI_API_KEY."}), 503

    skill = request.json.get('skill')
    difficulty = request.json.get('difficulty', 'beginner')
    student_id = request.json.get('student_id')

    if not skill:
        return jsonify({"error": "Skill is required"}), 400

    try:
        generator = get_generator()

        # Get student weak areas if student_id provided
        weak_areas = []
        if student_id:
            student_data = db_load_students()
            if student_id in student_data:
                metrics = student_data[student_id].get('metrics', {}).get('skill_performance', {})
                if skill in metrics:
                    weak_areas = metrics[skill].get('struggling_areas', [])

        # Generate combined lesson and questions package
        print(f"Generating combined AI package for skill: {skill}")
        package = generator.generate_lesson_with_questions(
            skill=skill,
            difficulty=difficulty,
            student_weak_areas=weak_areas,
            question_count=5
        )

        lesson_data = package.get('lesson', {})
        generated_questions = package.get('questions', [])

        # Save to domain data
        domain_data = read_json_file(DOMAIN_FILE)
        lessons = ensure_lessons(domain_data)

        skill_lessons = lessons.setdefault(skill, [])
        lesson_id = f"{skill}_ai_lesson_{len(skill_lessons) + 1}"

        new_lesson = {
            'id': lesson_id,
            'title': lesson_data.get('title', f'{skill} - AI Generated'),
            'description': lesson_data.get('description', 'AI-generated lesson'),
            'content': lesson_data.get('content', ''),
            'learning_objectives': lesson_data.get('learning_objectives', []),
            'key_concepts': lesson_data.get('key_concepts', []),
            'ai_generated': True
        }

        skill_lessons.append(new_lesson)
        domain_data['lessons'] = lessons

        # Add auto-generated questions
        all_questions = domain_data.get('questions', [])
        next_id = max([q['id'] for q in all_questions] or [0]) + 1

        for i, q in enumerate(generated_questions):
            q['id'] = next_id + i
            q['skill'] = skill
            q['level'] = 1
            q['lesson'] = lesson_id
            q['ai_generated'] = True

        all_questions.extend(generated_questions)
        domain_data['questions'] = all_questions

        print(f"Successfully generated lesson and {len(generated_questions)} questions for {lesson_id}")

        write_json_file(DOMAIN_FILE, domain_data)

        return jsonify({
            "success": True,
            "lesson": new_lesson,
            "questions_generated": len(generated_questions) > 0
        })

    except Exception as e:
        print(f"Combined generation failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/ai/generate-questions', methods=['POST'])
def ai_generate_questions():
    """Generate questions using AI."""
    if not AI_ENABLED:
        return jsonify({"error": "AI features not available. Check GEMINI_API_KEY."}), 503

    skill = request.json.get('skill')
    difficulty = request.json.get('difficulty', 'beginner')
    count = request.json.get('count', 5)
    lesson_id = request.json.get('lesson_id')
    focus_areas = request.json.get('focus_areas', [])

    if not skill:
        return jsonify({"error": "Skill is required"}), 400

    try:
        generator = get_generator()
        questions = generator.generate_questions(skill, difficulty, count, lesson_id, focus_areas)

        # Add questions to domain data
        domain_data = read_json_file(DOMAIN_FILE)
        all_questions = domain_data.get('questions', [])

        # Get next ID
        next_id = max([q['id'] for q in all_questions] or [0]) + 1

        # Add IDs and metadata
        for i, q in enumerate(questions):
            q['id'] = next_id + i
            q['skill'] = skill
            q['level'] = 1
            q['ai_generated'] = True
            if lesson_id:
                q['lesson'] = lesson_id

        all_questions.extend(questions)
        domain_data['questions'] = all_questions
        write_json_file(DOMAIN_FILE, domain_data)

        return jsonify({
            "success": True,
            "questions": questions,
            "count": len(questions)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/ai/personalized-practice', methods=['POST'])
def ai_personalized_practice():
    """Generate personalized practice set for a student."""
    if not AI_ENABLED:
        return jsonify({"error": "AI features not available. Check GEMINI_API_KEY."}), 503

    student_id = request.json.get('student_id')
    skill = request.json.get('skill')
    count = request.json.get('count', 5)

    if not student_id or not skill:
        return jsonify({"error": "student_id and skill are required"}), 400

    try:
        student_data = read_json_file(STUDENT_FILE)

        if student_id not in student_data:
            return jsonify({"error": "Student not found"}), 404

        generator = get_generator()
        practice_data = generator.generate_personalized_practice(
            student_data[student_id], skill, count
        )

        # Optionally save questions to domain
        domain_data = read_json_file(DOMAIN_FILE)
        all_questions = domain_data.get('questions', [])
        next_id = max([q['id'] for q in all_questions] or [0]) + 1

        generated_questions = practice_data.get('questions', [])
        for i, q in enumerate(generated_questions):
            q['id'] = next_id + i
            q['skill'] = skill
            q['level'] = 1
            q['ai_generated'] = True
            q['personalized'] = True

        all_questions.extend(generated_questions)
        domain_data['questions'] = all_questions
        write_json_file(DOMAIN_FILE, domain_data)

        return jsonify({
            "success": True,
            "practice": practice_data,
            "questions_added": len(generated_questions)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/ai/generate-hints', methods=['POST'])
def ai_generate_hints():
    """Generate hints for a question using AI."""
    if not AI_ENABLED:
        return jsonify({"error": "AI features not available. Check GEMINI_API_KEY."}), 503

    question = request.json.get('question')
    answer = request.json.get('answer')
    count = request.json.get('count', 3)

    if not question or not answer:
        return jsonify({"error": "question and answer are required"}), 400

    try:
        generator = get_generator()
        hints = generator.generate_hints(question, answer, count)

        return jsonify({
            "success": True,
            "hints": hints
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        # Ensure tables exist
        db.create_all()

        # Check if we have any domain data, if not, create default
        if not Domain.query.first():
            print("Initializing default domain data in database...")
            default_domain = {
                "skills": DEFAULT_SKILLS,
                "questions": [
                    {"id": 1, "skill": "vocabulary", "question": "What is the opposite of 'hot'?", "answer": "cold"},
                    {"id": 2, "skill": "vocabulary", "question": "What is the opposite of 'sad'?", "answer": "happy"},
                    {"id": 3, "skill": "vocabulary", "question": "What word means 'very big'?", "answer": "huge"},
                    {"id": 4, "skill": "grammar", "question": "Which word is the verb: 'The dog *runs* fast'?", "answer": "runs"},
                    {"id": 5, "skill": "grammar", "question": "What type of word is 'beautiful'?", "answer": "adjective"},
                ]
            }
            for category, data in default_domain.items():
                db.session.add(Domain(category=category, data=data))
            db.session.commit()

        # Check if we have any students, if not, create defaults
        if not Student.query.first():
            print("Initializing default students in database...")
            default_students = {
                "student_alex": create_new_student_profile("student_alex", "password123"),
                "student": create_new_student_profile("student", "student"),
                "admin": create_new_student_profile("admin", "admin", "admin")
            }
            default_students["student_alex"]["name"] = "Alex Smith"
            default_students["student_alex"]["email"] = "student@test.com"

            for username, data in default_students.items():
                db.session.add(Student(username=username, data=data))
            db.session.commit()

    port = int(os.environ.get("FLASK_PORT", 5000))
    app.run(debug=True, port=port)
