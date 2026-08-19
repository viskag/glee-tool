"use client";

import { useState } from "react";

type SectionKey = "BACKGROUND" | "TEST" | "GAME_UX";
type QuestionType = "Multiple choice" | "Likert scale" | "Short answer";

type Question = {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  objective: string;
  bloom: string;
  correct: string;
  pair: string;
  construct: string;
  options: string[];
};

const sectionInfo: Record<SectionKey, { label: string; eyebrow: string; detail: string }> = {
  BACKGROUND: { label: "Background", eyebrow: "01", detail: "Participant context" },
  TEST: { label: "Knowledge test", eyebrow: "02", detail: "Used before & after play" },
  GAME_UX: { label: "Game UX", eyebrow: "03", detail: "Experience & GLEE measures" },
};

const initialQuestions: Record<SectionKey, Question[]> = {
  BACKGROUND: [
    { id: "BG_01", text: "How often do you play digital games?", type: "Multiple choice", required: true, objective: "", bloom: "", correct: "", pair: "", construct: "", options: ["Daily", "A few times a week", "A few times a month", "Rarely"] },
  ],
  TEST: [
    { id: "TEST_Q_01", text: "Which action should you take when you encounter a suspicious email?", type: "Multiple choice", required: true, objective: "Identify phishing attempts", bloom: "Applying", correct: "B", pair: "", construct: "", options: ["Reply to ask who sent it", "Report it and avoid opening links", "Forward it to a friend", "Download the attachment"] },
    { id: "TEST_Q_02", text: "How confident are you in identifying a phishing attempt?", type: "Likert scale", required: true, objective: "", bloom: "", correct: "", pair: "", construct: "Perceived learning", options: ["1 - Not at all confident", "2", "3", "4", "5 - Very confident"] },
  ],
  GAME_UX: [
    { id: "UX_Q_01", text: "I was fully absorbed in the game.", type: "Likert scale", required: true, objective: "", bloom: "", correct: "", pair: "", construct: "Immersion", options: ["Strongly disagree", "Disagree", "Neither agree nor disagree", "Agree", "Strongly agree"] },
  ],
};

const constructOptions = ["", "Ease of control", "Goals & rules", "Progress feedback", "Challenge", "Audiovisual appeal", "Competence", "Autonomy", "Discovery", "Immersion", "Meaning", "Narrativity", "Relatedness", "Pleasure", "Arousal", "Dominance", "Flow", "Perceived learning", "Game acceptance"];

export default function Home() {
  const [activeSection, setActiveSection] = useState<SectionKey>("TEST");
  const [questions, setQuestions] = useState(initialQuestions);
  const [selectedId, setSelectedId] = useState("TEST_Q_01");
  const [view, setView] = useState<"builder" | "preview">("builder");
  const [published, setPublished] = useState(false);

  const activeQuestions = questions[activeSection];
  const selected = activeQuestions.find((question) => question.id === selectedId) ?? activeQuestions[0];
  const totalQuestions = Object.values(questions).flat().length;

  function updateQuestion(field: keyof Question, value: string | boolean) {
    setQuestions((current) => ({
      ...current,
      [activeSection]: current[activeSection].map((question) => question.id === selected.id ? { ...question, [field]: value } : question),
    }));
  }

  function updateOption(index: number, value: string) {
    setQuestions((current) => ({
      ...current,
      [activeSection]: current[activeSection].map((question) => question.id === selected.id ? { ...question, options: question.options.map((option, optionIndex) => optionIndex === index ? value : option) } : question),
    }));
  }

  function addOption() {
    setQuestions((current) => ({
      ...current,
      [activeSection]: current[activeSection].map((question) => question.id === selected.id ? { ...question, options: [...question.options, `Option ${question.options.length + 1}`] } : question),
    }));
  }

  function removeOption(index: number) {
    if (selected.options.length <= 2) return;
    setQuestions((current) => ({
      ...current,
      [activeSection]: current[activeSection].map((question) => question.id === selected.id ? { ...question, options: question.options.filter((_, optionIndex) => optionIndex !== index) } : question),
    }));
  }

  function addQuestion() {
    const prefix = activeSection === "BACKGROUND" ? "BG" : activeSection === "TEST" ? "TEST_Q" : "UX_Q";
    const nextNumber = activeQuestions.length + 1;
    const newQuestion: Question = { id: `${prefix}_${String(nextNumber).padStart(2, "0")}`, text: "Untitled question", type: "Multiple choice", required: false, objective: "", bloom: "", correct: "", pair: "", construct: "", options: ["Option 1", "Option 2"] };
    setQuestions((current) => ({ ...current, [activeSection]: [...current[activeSection], newQuestion] }));
    setSelectedId(newQuestion.id);
  }

  function selectSection(section: SectionKey) {
    setActiveSection(section);
    setSelectedId(questions[section][0]?.id ?? "");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">G</span><span>GLEE <small>studio</small></span></div>
        <div className="workspace-label">Workspace</div>
        <div className="study-mini"><div className="study-dot">P</div><div><strong>Phishing Quest</strong><span>Draft study</span></div><span className="chevron">v</span></div>
        <nav className="main-nav"><button className="nav-item active"><span className="nav-icon">[]</span>Questionnaire</button><button className="nav-item muted"><span className="nav-icon">#</span>Responses <b>0</b></button><button className="nav-item muted"><span className="nav-icon">i</span>Study settings</button></nav>
        <div className="sidebar-bottom"><div className="completion"><div className="completion-row"><span>Study completion</span><strong>{Math.round((totalQuestions / 8) * 100)}%</strong></div><div className="progress"><span style={{ width: `${Math.min((totalQuestions / 8) * 100, 100)}%` }} /></div><small>{totalQuestions} of 8 recommended questions</small></div><div className="user-chip"><span className="avatar">AR</span><span><strong>Alex Rivera</strong><small>Researcher</small></span><span className="more">...</span></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><div><span className="breadcrumb">Studies / Phishing Quest /</span> <strong>{view === "builder" ? "Questionnaire" : "Participant preview"}</strong></div><div className="top-actions"><span className={`save-state ${published ? "published" : ""}`}><span className="status-dot" />{published ? "Published" : "All changes saved"}</span><button className="preview-button" onClick={() => setView(view === "builder" ? "preview" : "builder")}>{view === "builder" ? "Preview study" : "Back to builder"}<span>{"->"}</span></button><button className="publish-button" onClick={() => setPublished(true)}>{published ? "Published" : "Publish study"}<span>^</span></button></div></header>

        {view === "preview" ? <ParticipantPreview questions={questions} onBack={() => setView("builder")} /> : <>
          <div className="page-heading"><div><div className="overline">QUESTIONNAIRE BUILDER</div><h1>Build your study</h1><p>Structure the moments that turn gameplay into evidence.</p></div><div className="heading-meta"><span className="meta-icon">P</span><div><strong>Phishing Quest</strong><span>Serious game evaluation</span></div><button className="edit-title">Edit</button></div></div>
          <div className="builder-layout">
            <div className="section-column"><div className="column-heading"><div><span className="overline">STUDY FLOW</span><h2>Sections</h2></div><button className="icon-button" aria-label="Add section">+</button></div><div className="section-list">{(Object.keys(sectionInfo) as SectionKey[]).map((section) => <button key={section} className={`section-card ${activeSection === section ? "selected" : ""}`} onClick={() => selectSection(section)}><span className="section-number">{sectionInfo[section].eyebrow}</span><span className="section-copy"><strong>{sectionInfo[section].label}</strong><small>{sectionInfo[section].detail}</small></span><span className="section-count">{questions[section].length}</span></button>)}</div><div className="flow-note"><span className="spark">*</span><div><strong>One test, two moments</strong><p>The knowledge test is authored once, then reused after play with randomized question and answer order.</p></div></div></div>
            <div className="question-column"><div className="column-heading"><div><span className="overline">{sectionInfo[activeSection].eyebrow} / {activeSection}</span><h2>{sectionInfo[activeSection].label} questions</h2></div><button className="add-question" onClick={addQuestion}>+ Add question</button></div><div className="question-list">{activeQuestions.map((question) => <button key={question.id} className={`question-row ${selected?.id === question.id ? "selected" : ""}`} onClick={() => setSelectedId(question.id)}><span className="drag">::</span><span className="question-index">{String(activeQuestions.indexOf(question) + 1).padStart(2, "0")}</span><span className="question-summary"><strong>{question.text}</strong><small>{question.id} <i /> {question.type}{question.objective && <><i /> Learning measure</>}</small></span><span className="required-pill">{question.required ? "Required" : "Optional"}</span><span className="row-arrow">{"->"}</span></button>)}</div></div>
            <div className="inspector"><div className="inspector-head"><div><span className="overline">QUESTION DETAILS</span><h2>{selected?.id ?? "New question"}</h2></div><button className="more-button">...</button></div>{selected && <><label className="field-label">Question text<textarea value={selected.text} onChange={(event) => updateQuestion("text", event.target.value)} /></label><div className="field-grid"><label className="field-label">Question ID<input value={selected.id} onChange={(event) => updateQuestion("id", event.target.value)} /></label><label className="field-label">Question type<select value={selected.type} onChange={(event) => updateQuestion("type", event.target.value)}><option>Multiple choice</option><option>Likert scale</option><option>Short answer</option></select></label></div><label className="toggle-field"><span><strong>Required question</strong><small>Participants must answer this to continue</small></span><button className={`toggle ${selected.required ? "on" : ""}`} onClick={() => updateQuestion("required", !selected.required)} aria-label="Toggle required"><span /></button></label>{selected.type !== "Short answer" && <div className="metadata-block options-block"><div className="metadata-title"><span>Answer options</span><small>{selected.options.length} choices</small></div>{selected.options.map((option, optionIndex) => <div className="option-editor" key={`${selected.id}-option-${optionIndex}`}><span>{String.fromCharCode(65 + optionIndex)}</span><input value={option} onChange={(event) => updateOption(optionIndex, event.target.value)} aria-label={`Option ${optionIndex + 1}`} /><button type="button" onClick={() => removeOption(optionIndex)} aria-label={`Remove option ${optionIndex + 1}`}>x</button></div>)}<button type="button" className="add-option" onClick={addOption}>+ Add answer option</button></div>}<div className="metadata-block"><div className="metadata-title"><span>Learning metadata</span><small>Used for future learning-gain analysis</small></div><label className="field-label">Learning objective<input value={selected.objective} onChange={(event) => updateQuestion("objective", event.target.value)} placeholder="e.g. Identify phishing attempts" /></label><div className="field-grid"><label className="field-label">Bloom level<select value={selected.bloom} onChange={(event) => updateQuestion("bloom", event.target.value)}><option value="">Not specified</option><option>Remembering</option><option>Understanding</option><option>Applying</option><option>Analysing</option><option>Evaluating</option><option>Creating</option></select></label><label className="field-label">Correct answer<input value={selected.correct} onChange={(event) => updateQuestion("correct", event.target.value)} placeholder="e.g. B" /></label></div><label className="field-label">Pre / post pair<input value={selected.pair} onChange={(event) => updateQuestion("pair", event.target.value)} placeholder="e.g. POST_Q_01" /></label></div><div className="metadata-block glee-block"><div className="metadata-title"><span>GLEE construct</span><small>Optional experience measure</small></div><label className="field-label"><select value={selected.construct} onChange={(event) => updateQuestion("construct", event.target.value)}>{constructOptions.map((option) => <option key={option} value={option}>{option || "No construct linked"}</option>)}</select></label></div></>}</div>
          </div>
        </>}
      </section>
    </main>
  );
}

type PreviewItem =
  | { kind: "question"; question: Question; section: SectionKey; phase: "background" | "pre-test" | "post-test" | "game-ux" }
  | { kind: "game"; id: "GAME_SESSION"; section: "GAME"; phase: "game" };

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function createPreviewItems(questions: Record<SectionKey, Question[]>): PreviewItem[] {
  const background = questions.BACKGROUND.map((question) => ({ kind: "question" as const, question, section: "BACKGROUND" as const, phase: "background" as const }));
  const preTest = questions.TEST.map((question) => ({ kind: "question" as const, question, section: "TEST" as const, phase: "pre-test" as const }));
  const postTest = shuffle(questions.TEST).map((question) => ({ kind: "question" as const, question: { ...question, options: shuffle(question.options) }, section: "TEST" as const, phase: "post-test" as const }));
  const gameUx = questions.GAME_UX.map((question) => ({ kind: "question" as const, question, section: "GAME_UX" as const, phase: "game-ux" as const }));
  return [...background, ...preTest, { kind: "game", id: "GAME_SESSION", section: "GAME", phase: "game" }, ...postTest, ...gameUx];
}

function ParticipantPreview({ questions, onBack }: { questions: Record<SectionKey, Question[]>; onBack: () => void }) {
  const [items] = useState(() => createPreviewItems(questions));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const currentItem = items[currentIndex];
  const currentQuestion = currentItem.kind === "question" ? currentItem.question : undefined;
  const answerKey = currentQuestion ? `${currentItem.phase}:${currentQuestion.id}` : "";
  const progress = submitted ? 100 : ((currentIndex + 1) / items.length) * 100;

  function updateAnswer(value: string) {
    setAnswers((current) => ({ ...current, [answerKey]: value }));
    setError("");
  }

  function continuePreview() {
    if (currentQuestion?.required && !answers[answerKey]?.trim()) {
      setError("Please choose an answer before continuing.");
      return;
    }
    if (currentIndex === items.length - 1) {
      setSubmitted(true);
      return;
    }
    setCurrentIndex((current) => current + 1);
    setError("");
  }

  const phaseLabel = currentItem.kind === "game" ? "Game session" : sectionInfo[currentItem.section].label;
  const phaseOverline = currentItem.kind === "game" ? "PLAY THE SERIOUS GAME" : currentItem.phase === "pre-test" ? "PRE-TEST" : currentItem.phase === "post-test" ? "POST-TEST / RANDOMIZED" : currentItem.phase === "game-ux" ? "GAME EXPERIENCE" : "WELCOME";
  const heading = currentItem.kind === "game" ? "Your game session starts here." : currentItem.phase === "background" ? "Let&apos;s get a baseline." : sectionInfo[currentItem.section].label;
  const description = currentItem.kind === "game" ? "This preview pauses at the game session. In the live study, the participant would now play the educational game before returning for the randomized post-test." : currentItem.phase === "background" ? "Your answers help us understand how the game supports learning. There are no right or wrong answers in this first section." : "Answer each question as honestly as you can. Your responses will be used to evaluate the learning experience.";

  return <div className="preview-wrap"><div className="preview-top"><div><span className="overline">PARTICIPANT VIEW</span><h1>Phishing Quest</h1><p>A short evaluation about what you learned and how the game felt to play.</p></div><button className="preview-close" onClick={onBack}>Close preview</button></div><div className="participant-card"><div className="participant-progress"><span>{submitted ? "Complete" : phaseLabel}</span><span>{submitted ? "Response saved" : `Step ${currentIndex + 1} of ${items.length}`}</span></div><div className="participant-line"><span style={{ width: `${progress}%` }} /></div>{submitted ? <div className="participant-content completion-content"><span className="success-mark">OK</span><span className="overline">RESPONSE SAVED</span><h2>Thank you for taking part.</h2><p>Your preview response has been recorded for this session. In the connected version, it will be saved with a participant and study record for later analysis.</p><button className="continue-button" onClick={onBack}>Return to builder <span>{"->"}</span></button></div> : <div className={`participant-content ${currentItem.kind === "game" ? "game-session-content" : ""}`}><span className="overline">{phaseOverline}</span><h2>{heading}</h2><p>{description}</p>{currentQuestion && <div className="preview-question" key={`${currentItem.phase}:${currentQuestion.id}`}><strong>{currentQuestion.text}</strong>{currentQuestion.type === "Short answer" ? <textarea className="preview-textarea" value={answers[answerKey] ?? ""} onChange={(event) => updateAnswer(event.target.value)} placeholder="Type your answer..." /> : currentQuestion.options.map((option) => <label key={option} className={`answer-option ${answers[answerKey] === option ? "chosen" : ""}`}><input type="radio" name={answerKey} value={option} checked={answers[answerKey] === option} onChange={(event) => updateAnswer(event.target.value)} /> <span>{option}</span></label>)}</div>}{error && <p className="answer-error">{error}</p>}<button className="continue-button" onClick={continuePreview}>{currentItem.kind === "game" ? "Return from game" : currentIndex === items.length - 1 ? "Submit response" : "Continue"} <span>{"->"}</span></button></div>}</div></div>;
}
