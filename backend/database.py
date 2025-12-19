from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB
import os

db = SQLAlchemy()

class Student(db.Model):
    __tablename__ = 'students'
    username = db.Column(db.String(80), primary_key=True)
    # Store the entire profile as JSONB to maintain flexibility
    data = db.Column(JSONB)

class Domain(db.Model):
    __tablename__ = 'domain'
    # Category can be 'questions', 'skills', 'lessons', 'question_stats'
    category = db.Column(db.String(50), primary_key=True)
    data = db.Column(JSONB)

def init_db(app):
    url = os.getenv('DATABASE_URL')
    if not url:
        print("WARNING: DATABASE_URL not found!")
        return

    app.config['SQLALCHEMY_DATABASE_URI'] = url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    try:
        with app.app_context():
            db.create_all()
            print("Database tables verified.")
    except Exception as e:
        print(f"DATABASE ERROR: {e}")
