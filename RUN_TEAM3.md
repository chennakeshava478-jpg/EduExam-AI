# Team 03 — EduExam AI (ExamShield) — How to run

This copy of UniSphere shows **only the Team 03 exam module**.
Landing page, login, header, sidebar and colours are unchanged.

## Run
```
npm install
npm run dev
```
Open the URL shown (usually http://localhost:5173) → Open Portal → login.

| Role    | Email                   | Password             |
|---------|-------------------------|----------------------|
| Faculty | faculty@chanakya.edu    | faculty@chanakya123  |
| Student | student@chanakya.edu    | student@chanakya123  |

Use the same browser for both roles (data is stored in localStorage).

## Demo flow
1. Faculty → Exam Question Studio → "My Subjects & Course Outlines" (Python, Java, Data Structures, DBMS; upload/edit outline or add a subject).
2. "Prepare Question Paper" / "Create New Exam Paper" → AI asks which subject → choose Manual or With AI.
3. Edit/add/delete any question → Save → Publish → choose Print Question Paper or Online Exam.
4. Student → Exams → published subjects → Open Exam → instructions → Start Exam (fullscreen) → Submit.
5. AI evaluation: marks, wrong answers with correct answers, topic-wise performance, improvement suggestions.

## Team-3-only switch
src/App.tsx → TEAM3_ONLY = true; src/components/portal/PortalSidebar.tsx → TEAM3_ONLY_NAV = true.
Set both to false to restore the full portal.

## Files (src/modules/team03_exams)
New: components/FacultyPaperWizard.tsx, StudentExamPortal.tsx, ExamResultView.tsx; services/aiExamEngine.ts, questionBank.ts, printService.ts
Modified: LockdownExamShell.tsx, AuthoringStudio.tsx, examService.ts, exams.types.ts, index.tsx

## Optional: LLM marking with an API key
1. Create a file named `.env.local` in the project root (same folder as package.json):
```
VITE_ANTHROPIC_API_KEY=your-key-here
VITE_ANTHROPIC_MODEL=claude-haiku-5-5
```
2. Stop and restart `npm run dev` (env files are read only at start).
3. After a student submits, the result screen badge shows "AI EVALUATION · LLM". Without a key (or if the API call fails) it shows "OFFLINE ENGINE" and uses the built-in evaluator.

Never commit `.env.local` (it is git-ignored). VITE_ keys are visible in the browser, so use this only for local demos.
