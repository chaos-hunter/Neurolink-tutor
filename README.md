# 🎓 Neuralinq ITS - AI-Powered Intelligent Tutoring System

> A sophisticated educational platform leveraging Google Gemini AI for personalized learning experiences

[![Python](https://img.shields.io/badge/Python-3.7+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB.svg)](https://reactjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-000000.svg)](https://flask.palletsprojects.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [AI & Machine Learning](#-ai--machine-learning)
- [System Architecture](#-system-architecture)
- [Quick Start](#-quick-start)
- [Usage Guide](#-usage-guide)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

Neuralinq ITS is an advanced Intelligent Tutoring System that combines traditional educational methodologies with cutting-edge AI technology. Built as a university project, it demonstrates the practical application of artificial intelligence in personalized education.

### What Makes It Special?

- **Real AI Integration**: Uses Google Gemini AI for dynamic content generation
- **Adaptive Learning**: Adjusts difficulty based on student performance
- **Personalized Content**: Generates custom lessons and questions for each student
- **Performance Analytics**: Tracks progress with detailed metrics and visualizations
- **Gamification**: Badge system to motivate and reward learning achievements

---

## ✨ Key Features

### 🤖 AI-Powered Content Generation

#### 1. **Dynamic Lesson Creation**
- Generates complete, structured lessons on any topic
- Includes learning objectives, key concepts, and examples
- Markdown-formatted content with images and formatting
- Adapts complexity based on student level

#### 2. **Intelligent Question Generation**
- Creates diverse question types (multiple choice, fill-in-blank, short answer)
- Generates progressive hints for each question
- Automatically adjusts difficulty level
- Includes detailed explanations

#### 3. **Personalized Practice Sets**
- Analyzes individual student performance data
- Identifies struggling areas and knowledge gaps
- Generates targeted practice questions
- Adapts to student's current mastery level

### 📊 Adaptive Learning System

#### Smart Recommender Engine
The system uses a sophisticated algorithm to personalize the learning experience:

```
Student Performance Analysis:
├── Mastery Tracking (0-1 scale per skill)
├── Accuracy Rate Calculation
├── Time-per-Question Analysis
├── Struggling Areas Identification
└── Historical Performance Trends

Adaptive Response:
├── If Mastery < 0.3 → Beginner content + foundational concepts
├── If Mastery 0.3-0.7 → Intermediate content + targeted practice
└── If Mastery > 0.7 → Advanced content + challenging problems
```

#### How It Works:

1. **Initial Diagnostic**: 5-question assessment across all skills
2. **Mastery Calculation**: Updates after each question using weighted scoring
3. **Dynamic Difficulty**: Questions adapt in real-time based on performance
4. **Personalized Recommendations**: Suggests lessons based on weak areas

### 🎯 Student Features

- **Diagnostic Assessment**: Quick skill evaluation on first login
- **Interactive Lessons**: Rich content with markdown rendering
- **Progressive Hints**: Get help without giving away answers
- **Real-time Feedback**: Instant validation and explanations
- **Progress Dashboard**: Visual representation of skill mastery
- **Performance Metrics**: Detailed analytics and insights
- **Achievement Badges**: Earn rewards for milestones
- **Session Tracking**: Resume where you left off

### 👨‍💼 Admin Features

- **Content Management**: Add/edit questions, lessons, and skills
- **AI Content Generator**: Create lessons and questions with AI
- **User Management**: View and manage student accounts
- **Image Integration**: Add visual content to lessons (Unsplash API)
- **Custom Badges**: Create achievement criteria and rewards
- **Analytics Dashboard**: Monitor student progress and system usage
- **Bulk Operations**: Manage content efficiently

---

## 🧠 AI & Machine Learning

### Google Gemini Integration

The system leverages Google's Gemini AI model for natural language understanding and content generation.

#### 1. Lesson Generation

**Input Data:**
- Skill/topic name
- Difficulty level (beginner/intermediate/advanced)
- Target audience

**AI Process:**
```python
def generate_lesson(skill, difficulty):
    prompt = f"""
    Create a comprehensive lesson on {skill} for {difficulty} level.
    Include:
    - Clear learning objectives
    - Key concepts with examples
    - Practice exercises
    - Real-world applications
    """
    return gemini.generate_content(prompt)
```

**Output:**
- Structured lesson with markdown formatting
- Learning objectives and key concepts
- Examples and practice problems
- Estimated reading time

#### 2. Personalized Question Generation

**Input Data:**
- Student mastery level (0-1 scale)
- Accuracy rate (percentage)
- Struggling areas (list of topics)
- Question count and difficulty

**AI Process:**
```python
def generate_personalized_practice(student_data, skill):
    mastery = student_data['mastery'][skill]
    accuracy = calculate_accuracy(student_data)
    struggling = student_data['struggling_areas']
    
    # Determine difficulty
    difficulty = 'beginner' if mastery < 0.3 else 
                 'intermediate' if mastery < 0.7 else 'advanced'
    
    prompt = f"""
    Generate practice questions for:
    - Skill: {skill}
    - Current mastery: {mastery:.2f}
    - Accuracy: {accuracy:.1%}
    - Weak areas: {struggling}
    - Difficulty: {difficulty}
    
    Create questions that:
    1. Address weak areas
    2. Match current level
    3. Gradually increase difficulty
    4. Build confidence
    """
    return gemini.generate_content(prompt)
```

**Output:**
- Customized question set
- Progressive difficulty curve
- Targeted at student's weak areas
- Includes hints and explanations

#### 3. Adaptive Difficulty Algorithm

**Mastery Calculation:**
```python
def update_mastery(current_mastery, is_correct, time_spent):
    # Weighted update based on performance
    if is_correct:
        if time_spent < 10:  # Quick correct answer
            delta = 0.15
        else:  # Slow correct answer
            delta = 0.10
    else:
        delta = -0.05  # Penalty for incorrect
    
    # Apply bounds [0, 1]
    new_mastery = max(0, min(1, current_mastery + delta))
    return new_mastery
```

**Question Selection:**
```python
def select_next_question(student_mastery, available_questions):
    # Filter questions by appropriate difficulty
    if mastery < 0.3:
        candidates = [q for q in questions if q.difficulty == 'beginner']
    elif mastery < 0.7:
        candidates = [q for q in questions if q.difficulty == 'intermediate']
    else:
        candidates = [q for q in questions if q.difficulty == 'advanced']
    
    # Prioritize questions in struggling areas
    struggling_questions = [q for q in candidates 
                           if q.topic in student.struggling_areas]
    
    return struggling_questions[0] if struggling_questions else candidates[0]
```

### Machine Learning Concepts Applied

1. **Collaborative Filtering**: Recommends content based on similar student patterns
2. **Natural Language Processing**: AI understands and generates educational content
3. **Adaptive Learning**: System adjusts in real-time to student performance
4. **Pattern Recognition**: Identifies struggling areas from answer patterns
5. **Predictive Analytics**: Forecasts student performance and suggests interventions

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────-───┐
│                     Frontend (React)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Login   │  │  Lesson  │  │  Admin   │  │   AI     │      │
│  │Component │  │Component │  │  Panel   │  │Generator │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│         │              │              │              │       │
│         └──────────────┴──────────────┴──────────────┘       │
│                        │                                     │
│                   Axios HTTP                                 │
└────────────────────────┼─────────────────────────────────────┘
                         │
                    REST API
                         │
┌────────────────────────┼─────────────────────────────────────┐
│                  Backend (Flask)                             │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              API Routes                              │    │
│  │  /api/login  /api/get-question  /api/ai/generate     │    │
│  └──────────────────────────────────────────────────────┘    │
│         │                    │                    │          │
│  ┌──────▼──────┐      ┌─────▼─────┐      ┌──────▼──────┐     │
│  │   Student   │      │  Question │      │     AI      │     │
│  │  Management │      │  Selector │      │  Generator  │     │
│  └─────────────┘      └───────────┘      └─────────────┘     │
│         │                    │                    │          │
│         └────────────────────┴────────────────────┘          │
│                              │                               │
│                    ┌─────────▼─────────┐                     │
│                    │  Data Layer       │                     │
│                    │  (JSON Files)     │                     │
│                    └───────────────────┘                     │
└──────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Google Gemini AI │
                    │  (External API)   │
                    └───────────────────┘
```

### Data Flow

1. **User Authentication**: Login → Validate credentials → Create session
2. **Diagnostic Assessment**: Fetch questions → Student answers → Calculate mastery
3. **Lesson Selection**: Recommend based on mastery → Display content → Track progress
4. **Question Answering**: Select adaptive question → Validate answer → Update mastery
5. **AI Generation**: Request content → Send to Gemini → Parse response → Save to database

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.7+** - [Download](https://www.python.org/downloads/)
- **Node.js 14+** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)

### Installation

#### Option 1: Automated Setup (Recommended)

**Windows:**
```bash
git clone https://github.com/yourusername/neuralinq-its.git
cd neuralinq-its
run.bat
```

**Linux/Mac:**
```bash
git clone https://github.com/yourusername/neuralinq-its.git
cd neuralinq-its
chmod +x setup.sh
./setup.sh
```

The setup script will:
1. Check for and install Python dependencies if missing
2. Check for and install Node.js dependencies  if missing
3. Create environment files
4. Start both servers automatically

#### Option 2: Manual Setup

```bash
# 1. Clone repository
git clone https://github.com/yourusername/neuralinq-its.git
cd neuralinq-its

# 2. Backend setup
cd backend
pip install -r requirements.txt

# 3. Frontend setup
cd ../frontend
npm install

# 4. Start backend (Terminal 1)
cd backend
python app.py

# 5. Start frontend (Terminal 2)
cd frontend
npm start
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

---

## 📚 Usage Guide

### Default Accounts

**Student Account:**
- Username: `student`
- Password: `student`
- Role: Admin (has full access for demo purposes)

**Admin Account:**
- Username: `admin`
- Password: `admin`
- Role: Student (has student features for testing)

> **Note**: For university project demonstration, roles are intentionally flexible. Change passwords in production!

### Student Workflow

1. **Login** with student credentials
2. **Take Diagnostic** (first-time users)
   - Answer 5 questions across different skills
   - System calculates initial mastery levels
3. **View Recommendations**
   - System suggests lessons based on diagnostic results
4. **Select a Skill** to practice
5. **Read Lesson Content**
   - Markdown-formatted educational content
   - Images and examples
6. **Answer Questions**
   - Get instant feedback
   - Use progressive hints if needed
7. **Track Progress**
   - View mastery levels
   - Check performance metrics
   - See earned badges

### Admin Workflow

1. **Login** with admin credentials
2. **Manage Content**
   - Add new questions manually
   - Edit existing questions
   - Organize by skill and lesson
3. **Generate AI Content**
   - Click "🤖 AI Generator" in header
   - Select skill and difficulty
   - Choose content type:
     - **Complete Lesson**: Full lesson with objectives
     - **Questions Only**: Practice questions with hints
     - **Personalized Practice**: Custom content for specific student
4. **Add Images**
   - Search Unsplash for educational images
   - Add to lessons or questions
5. **Create Badges**
   - Define achievement criteria
   - Set icons and descriptions
6. **Monitor Users**
   - View all student accounts
   - Check progress and performance

### AI Content Generation

#### Generate a Lesson

1. Go to AI Generator
2. Select "Complete Lesson"
3. Choose skill (e.g., "vocabulary")
4. Select difficulty level
5. Click "Generate"
6. Review and save

#### Generate Personalized Practice

1. Go to AI Generator
2. Select "Personalized Practice"
3. Choose skill
4. **Select a student** from dropdown
5. Set number of questions
6. Click "Generate"
7. AI analyzes student's:
   - Current mastery level
   - Accuracy rate
   - Struggling areas
   - Question history
8. Generates targeted practice set

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Markdown** - Content rendering
- **CSS3** - Styling with dark mode support

### Backend
- **Flask 3.0** - Python web framework
- **Google Gemini AI** - Content generation
- **Unsplash API** - Educational images
- **JSON** - File-based database
- **CORS** - Cross-origin support

### AI/ML
- **Google Gemini Pro** - Large language model
- **Natural Language Processing** - Content understanding
- **Adaptive Algorithms** - Personalized learning paths
- **Pattern Recognition** - Struggling area identification

---

## 📁 Project Structure

```
neuralinq-its/
├── backend/                    # Flask backend
│   ├── data/                   # JSON database
│   │   ├── domain.json        # Questions, lessons, skills
│   │   └── student.json       # User data and progress
│   ├── app.py                 # Main Flask application
│   ├── ai_generator.py        # AI content generation
│   ├── image_service.py       # Unsplash integration
│   ├── test_ai.py            # AI testing script
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables (included for demo)
│
├── frontend/                   # React frontend
│   ├── public/                # Static files
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── Login.js      # Authentication
│   │   │   ├── Lesson.js     # Learning interface
│   │   │   ├── Admin.js      # Admin panel
│   │   │   ├── AIGenerator.js # AI content creation
│   │   │   ├── Profile.js    # User profile
│   │   │   ├── Metrics.js    # Analytics
│   │   │   ├── Results.js    # Performance history
│   │   │   ├── Badges.js     # Achievements
│   │   │   └── Settings.js   # User preferences
│   │   ├── App.js            # Main application
│   │   ├── App.css           # Global styles
│   │   └── index.js          # Entry point
│   ├── package.json          # Node dependencies
│   └── .env                  # Frontend config
│
├── docs/                      # Documentation
│   └── RECOMMENDER_WORKFLOW.md # System architecture
│
├── setup.bat                  # Windows setup script
├── setup.sh                   # Linux/Mac setup script
├── test_system.bat           # System test script
├── .gitignore                # Git ignore rules
├── LICENSE                   # MIT License
└── README.md                 # This file
```

---

## 🔑 Environment Variables

### Backend (.env)

The `.env` file is **included in this repository** for university project demonstration purposes. In production, keep this file private!

```bash
# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True
FLASK_PORT=5000

# Google Gemini AI (Required for AI features)
GEMINI_API_KEY=your_gemini_api_key_here

# Unsplash Images (Optional)
UNSPLASH_ACCESS_KEY=your_unsplash_key_here
```

### Get API Keys (Free)

**Google Gemini AI:**
1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy and paste into `.env`

**Unsplash (Optional):**
1. Visit: https://unsplash.com/developers
2. Register as developer
3. Create new application
4. Copy "Access Key"
5. Paste into `.env`

> **Note**: The system works without API keys, but AI features will be disabled.

---

## 🧪 Testing

### Quick System Test

```bash
# Windows
test_system.bat

# Linux/Mac
chmod +x test_system.sh
./test_system.sh
```

### Manual Testing

1. **Backend Health Check**
```bash
curl http://localhost:5000/api/skills
```

2. **AI Status Check**
```bash
curl http://localhost:5000/api/ai/status
```

3. **Test AI Generation**
```bash
cd backend
python test_ai.py
```

---

## 🎓 Educational Value

This project demonstrates:

1. **Full-Stack Development**: React frontend + Flask backend
2. **AI Integration**: Real-world use of large language models
3. **Adaptive Systems**: Dynamic content based on user behavior
4. **Data Management**: JSON-based database with CRUD operations
5. **API Design**: RESTful endpoints and proper error handling
6. **User Experience**: Responsive design and intuitive interface
7. **Software Engineering**: Clean code, modular architecture, documentation

---

## 🤝 Contributing

This is a university project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini AI** - For powerful content generation capabilities
- **Unsplash** - For free educational images
- **React Team** - For the amazing frontend framework
- **Flask Team** - For the lightweight backend framework

---

## 📞 Support

For questions or issues:
1. Check the [documentation](docs/)
2. Review existing issues on GitHub
3. Open a new issue with detailed description

---

## 🎯 Future Enhancements

- [ ] Multi-language support
- [ ] Voice-based interactions
- [ ] Mobile application
- [ ] Real-time collaboration
- [ ] Advanced analytics dashboard
- [ ] Integration with LMS platforms
- [ ] Video content support
- [ ] Peer-to-peer learning features

---

**Built with ❤️ for education | University Project 2025**

**Version**: 1.0.0  
**Status**: ✅ Production Ready!
