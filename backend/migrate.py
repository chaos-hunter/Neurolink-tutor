import json
import os
from dotenv import load_dotenv
from flask import Flask
from database import db, Student, Domain, init_db

load_dotenv()

app = Flask(__name__)
# Temporary URI if not set, but will fail if not using real one
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
db.init_app(app)

def read_json_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None

def migrate():
    with app.app_context():
        print("Creating tables...")
        db.create_all()

        # Migrate Students
        student_file = 'data/student.json'
        if os.path.exists(student_file):
            print("Migrating students...")
            students = read_json_file(student_file)
            if students:
                for username, data in students.items():
                    existing = Student.query.get(username)
                    if not existing:
                        db.session.add(Student(username=username, data=data))
                    else:
                        existing.data = data
                db.session.commit()
                print(f"Migrated {len(students)} students.")

        # Migrate Domain Data
        domain_file = 'data/domain.json'
        if os.path.exists(domain_file):
            print("Migrating domain data...")
            domain_data = read_json_file(domain_file)
            if domain_data:
                for category, data in domain_data.items():
                    existing = Domain.query.get(category)
                    if not existing:
                        db.session.add(Domain(category=category, data=data))
                    else:
                        existing.data = data
                db.session.commit()
                print("Migrated domain data (questions, lessons, skills, stats).")

        print("Migration complete!")

if __name__ == "__main__":
    if not os.getenv('DATABASE_URL'):
        print("ERROR: DATABASE_URL not found in .env")
    else:
        migrate()
