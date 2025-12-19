# Recommender Engine Workflow

This document summarizes how the ML-inspired question selection pipeline works end-to-end.

## Overview
The backend aims to keep students in a ~70% success "flow" zone by matching their skill mastery to dynamically estimated question difficulty. It relies on two JSON stores:

- `data/student.json` — per-student mastery and metrics (student model inputs)
- `data/domain.json` — question bank plus global per-question stats (question model inputs)

## Inputs
- **Student skill scores** come from `student['mastery'][skill]` (range 0–1). These track how well the student performs per skill.
- **Question difficulty scores** combine the question's tagged difficulty (`beginner`/`intermediate`/`advanced`) with global performance stats tracked in `domain['question_stats'][id]`. If most learners miss a question, its effective difficulty rises; if most answer correctly, it falls.

## Selection flow (`POST /api/get-question`)
1. **Skill choice:** Pick an unmastered skill using `choose_skill_based_on_metrics`, prioritizing struggling skills or the lowest-accuracy skill.
2. **Candidate set:** Filter questions for that skill and within the student's level.
3. **Difficulty estimation:** For each candidate, compute `get_question_difficulty_score`, which mixes the base tag with global accuracy and clamps to [0.05, 0.95].
4. **Success prediction:** Compare student skill to the difficulty score with a logistic curve `predict_success_probability`, yielding a probability between 0–1.
5. **Target matching:** Compute the distance of each question's predicted success from the 0.7 target and pick the closest (ties broken randomly).
6. **Response payload:** Return the chosen question plus `predicted_success_probability` and `question_difficulty_score` fields for transparency. Session timing is stored so submission can measure time-on-task.

## After answering (`POST /api/submit-answer`)
1. **Mastery update:** Adjust the student's mastery for the skill (+0.25 correct, −0.1 incorrect, clamped to [0,1]).
2. **Metric logging:** Append a detailed `question_history` entry and update per-skill aggregates in `metrics`.
3. **Global stats:** Increment `domain['question_stats'][id]` attempts/correct/incorrect so future difficulty estimates reflect cohort performance.
4. **Session reset:** Clear the current session and persist both JSON files.

## Why this meets the 70% rule
- The probability predictor translates the gap between student mastery and question difficulty into a success likelihood.
- The recommender picks the question whose predicted success is nearest to 0.7, keeping practice within the intended challenge band as both student mastery and global difficulty evolve.
