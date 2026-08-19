"use client";

import { useEffect, useRef, useState } from "react";

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

type Study = {
  id: string;
  name: string;
  description: string;
  gameName: string;
  gameInstructions: string;
  duration: string;
  welcomeText: string;
  anonymous: boolean;
  consentRequired: boolean;
  postTestRandomized: boolean;
  displayMode: "one-at-a-time" | "section";
};

const initialStudy: Study = {
  id: "phishing-quest",
  name: "Phishing Quest",
  description: "A serious game evaluation study about recognizing phishing attempts.",
  gameName: "Phishing Quest",
  gameInstructions: "Play the game as you normally would. The post-test will begin when your game session is complete.",
  duration: "15 minutes",
  welcomeText: "Thank you for taking part. This study explores what you learn and how the game feels to play.",
  anonymous: true,
  consentRequired: true,
  postTestRandomized: true,
  displayMode: "one-at-a-time",
};

type StudySummary = {
  id: string;
  name: string;
  description: string;
  status: "Draft" | "Published";
  updated: string;
  questions: number;
};

type QuestionnaireExport = {
  format: "glee-questionnaire";
  formatVersion: 1;
  exportedAt: string;
  study: Study;
  questions: Record<SectionKey, Question[]>;
};

type QuestionnaireRecord = {
  study: Study;
  questions: Record<SectionKey, Question[]>;
  published: boolean;
};

type ParticipantResponseExport = {
  format: "glee-participant-response";
  formatVersion: 1;
  responseId: string;
  submittedAt: string;
  questionnaire: {
    id: string;
    name: string;
    gameName: string;
    description: string;
    questions: Record<SectionKey, Question[]>;
  };
  answers: {
    BACKGROUND: Record<string, string>;
    PRE_TEST: Record<string, string>;
    POST_TEST: Record<string, string>;
    GAME_UX: Record<string, string>;
  };
  presentation: { displayMode: Study["displayMode"]; postTestRandomized: boolean };
};

const initialStudySummaries: StudySummary[] = [
  { id: "phishing-quest", name: "Phishing Quest", description: "Recognizing phishing attempts", status: "Draft", updated: "Just now", questions: 4 },
];

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
    { id: "TEST_Q_01", text: "Which action should you take when you encounter a suspicious email?", type: "Multiple choice", required: true, objective: "Identify phishing attempts", bloom: "Applying", correct: "Report it and avoid opening links", pair: "", construct: "", options: ["Reply to ask who sent it", "Report it and avoid opening links", "Forward it to a friend", "Download the attachment"] },
    { id: "TEST_Q_02", text: "How confident are you in identifying a phishing attempt?", type: "Likert scale", required: true, objective: "", bloom: "", correct: "", pair: "", construct: "Perceived learning", options: ["1 - Completely disagree", "2 - Disagree", "3 - Slightly disagree", "4 - Neutral / neither agree nor disagree", "5 - Slightly agree", "6 - Agree", "7 - Completely agree"] },
  ],
  GAME_UX: [
    { id: "UX_Q_01", text: "I was fully absorbed in the game.", type: "Likert scale", required: true, objective: "", bloom: "", correct: "", pair: "", construct: "Immersion", options: ["1 - Completely disagree", "2 - Disagree", "3 - Slightly disagree", "4 - Neutral / neither agree nor disagree", "5 - Slightly agree", "6 - Agree", "7 - Completely agree"] },
  ],
};

const constructOptions = ["", "Ease of control", "Goals & rules", "Progress feedback", "Challenge", "Audiovisual appeal", "Competence", "Autonomy", "Discovery", "Immersion", "Meaning", "Narrativity", "Relatedness", "Pleasure", "Arousal", "Dominance", "Flow", "Perceived learning", "Game acceptance"];

export default function Home() {
  const [activeSection, setActiveSection] = useState<SectionKey>("TEST");
  const [questions, setQuestions] = useState(initialQuestions);
  const [selectedId, setSelectedId] = useState("TEST_Q_01");
  const [view, setView] = useState<"library" | "builder" | "preview" | "settings" | "player" | "player-preview">("library");
  const [published, setPublished] = useState(false);
  const [study, setStudy] = useState(initialStudy);
  const [studySummaries, setStudySummaries] = useState(initialStudySummaries);
  const [questionnaireStore, setQuestionnaireStore] = useState<Record<string, QuestionnaireRecord>>({
    [initialStudy.id]: { study: initialStudy, questions: initialQuestions, published: false },
  });
  const [publishError, setPublishError] = useState("");
  const [playerStudy, setPlayerStudy] = useState<Study | null>(null);
  const [playerQuestions, setPlayerQuestions] = useState<Record<SectionKey, Question[]> | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const activeQuestions = questions[activeSection];
  const selected = activeQuestions.find((question) => question.id === selectedId) ?? activeQuestions[0];
  const totalQuestions = Object.values(questions).flat().length;

  useEffect(() => {
    setQuestionnaireStore((current) => ({ ...current, [study.id]: { study, questions, published } }));
  }, [study, questions, published]);

  function updateQuestion(field: keyof Question, value: string | boolean) {
    setQuestions((current) => ({
      ...current,
      [activeSection]: current[activeSection].map((question) => {
        if (question.id !== selected.id) return question;
        if (field === "type" && value === "Likert scale" && question.type !== "Likert scale") {
          return { ...question, type: "Likert scale" as const, options: ["1 - Completely disagree", "2 - Disagree", "3 - Slightly disagree", "4 - Neutral / neither agree nor disagree", "5 - Slightly agree", "6 - Agree", "7 - Completely agree"], correct: "" };
        }
        return { ...question, [field]: value };
      }),
    }));
  }

  function updateOption(index: number, value: string) {
    setQuestions((current) => ({
      ...current,
      [activeSection]: current[activeSection].map((question) => {
        if (question.id !== selected.id) return question;
        const previousOption = question.options[index];
        return { ...question, options: question.options.map((option, optionIndex) => optionIndex === index ? value : option), correct: question.correct === previousOption ? value : question.correct };
      }),
    }));
  }

  function setCorrectOption(option: string) {
    setQuestions((current) => ({
      ...current,
      [activeSection]: current[activeSection].map((question) => question.id === selected.id ? { ...question, correct: question.correct === option ? "" : option } : question),
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
      [activeSection]: current[activeSection].map((question) => {
        if (question.id !== selected.id) return question;
        const removedOption = question.options[index];
        return { ...question, options: question.options.filter((_, optionIndex) => optionIndex !== index), correct: question.correct === removedOption ? "" : question.correct };
      }),
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

  function updateStudy(field: keyof Study, value: string | boolean) {
    setStudy((current) => ({ ...current, [field]: value }));
    if (field === "name") {
      setStudySummaries((current) => current.map((item) => item.id === study.id ? { ...item, name: String(value), updated: "Just now" } : item));
    }
    setPublishError("");
  }

  function createQuestionnaire() {
    const newStudy: Study = { ...initialStudy, id: `questionnaire-${Date.now()}`, name: "Untitled questionnaire", description: "", gameName: "", gameInstructions: "", duration: "", welcomeText: "" };
    setStudy(newStudy);
    setQuestions({ BACKGROUND: [], TEST: [], GAME_UX: [] });
    setActiveSection("TEST");
    setSelectedId("");
    setPublished(false);
    setStudySummaries((current) => [{ id: newStudy.id, name: newStudy.name, description: "New educational game evaluation", status: "Draft", updated: "Just now", questions: 0 }, ...current]);
    setView("settings");
  }

  function openQuestionnaire(id: string) {
    const summary = studySummaries.find((item) => item.id === id);
    if (!summary) return;
    const record = questionnaireStore[id];
    if (record) {
      setStudy(record.study);
      setQuestions(record.questions);
      setPublished(record.published);
    } else {
      setStudy({ ...initialStudy, id: summary.id, name: summary.name, description: summary.description, gameName: summary.name });
      setQuestions({ BACKGROUND: [], TEST: [], GAME_UX: [] });
      setPublished(summary.status === "Published");
    }
    setActiveSection("TEST");
    setSelectedId(record?.questions.TEST[0]?.id ?? "");
    setView("builder");
  }

  function exportQuestionnaire() {
    const payload: QuestionnaireExport = { format: "glee-questionnaire", formatVersion: 1, exportedAt: new Date().toISOString(), study, questions };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(study.name || "questionnaire").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "questionnaire"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importQuestionnaire(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<QuestionnaireExport>;
        if (parsed.format !== "glee-questionnaire" || parsed.formatVersion !== 1 || !parsed.study || !parsed.questions) throw new Error("This is not a valid GLEE questionnaire export.");
        const importedStudy: Study = { ...initialStudy, ...parsed.study, id: `imported-${Date.now()}`, name: parsed.study.name?.trim() || "Imported questionnaire" };
        const importedQuestions: Record<SectionKey, Question[]> = { BACKGROUND: parsed.questions.BACKGROUND ?? [], TEST: parsed.questions.TEST ?? [], GAME_UX: parsed.questions.GAME_UX ?? [] };
        const questionCount = Object.values(importedQuestions).flat().length;
        setStudy(importedStudy);
        setQuestions(importedQuestions);
        setQuestionnaireStore((current) => ({ ...current, [importedStudy.id]: { study: importedStudy, questions: importedQuestions, published: false } }));
        setStudySummaries((current) => [{ id: importedStudy.id, name: importedStudy.name, description: importedStudy.description || "Imported GLEE questionnaire", status: "Draft", updated: "Just now", questions: questionCount }, ...current]);
        setActiveSection("TEST");
        setSelectedId(importedQuestions.TEST[0]?.id ?? importedQuestions.BACKGROUND[0]?.id ?? "");
        setPublished(false);
        setPublishError("");
        setView("settings");
      } catch (error) {
        setPublishError(error instanceof Error ? error.message : "Could not load this JSON file.");
        setView("library");
      }
    };
    reader.readAsText(file);
  }

  function publishStudy() {
    if (!study.name.trim()) {
      setPublishError("Add a study name before publishing.");
      setView("settings");
      return;
    }
    if (questions.TEST.length === 0) {
      setPublishError("Add at least one knowledge-test question before publishing.");
      setView("builder");
      setActiveSection("TEST");
      return;
    }
    if (study.postTestRandomized === false) {
      setPublishError("Post-test randomization must be enabled for this study flow.");
      setView("settings");
      return;
    }
    setPublished(true);
    setPublishError("");
  }

  function startPlayer(id: string) {
    const record = questionnaireStore[id];
    const summary = studySummaries.find((item) => item.id === id);
    if (!summary) return;
    if (record) {
      setPlayerStudy(record.study);
      setPlayerQuestions(record.questions);
    } else {
      setPlayerStudy({ ...initialStudy, id: summary.id, name: summary.name, description: summary.description, gameName: summary.name });
      setPlayerQuestions(initialQuestions);
    }
    setView("player-preview");
  }

  function saveParticipantResponse(response: ParticipantResponseExport) {
    const blob = new Blob([JSON.stringify(response, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${response.questionnaire.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "questionnaire"}-response-${response.responseId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">G</span><span>GLEE <small>studio</small></span></div>
        <div className="workspace-label">Workspace</div>
        <button className="study-mini" onClick={() => setView("library")}><div className="study-dot">{study.name.slice(0, 1).toUpperCase() || "S"}</div><div><strong>{study.name || "Untitled questionnaire"}</strong><span>{published ? "Published" : "Draft questionnaire"}</span></div><span className="chevron">v</span></button>
        <nav className="main-nav"><button className={`nav-item ${view === "library" ? "active" : "muted"}`} onClick={() => setView("library")}><span className="nav-icon">::</span>Questionnaires <b>{studySummaries.length}</b></button><button className={`nav-item ${view === "player" ? "active" : "muted"}`} onClick={() => setView("player")}><span className="nav-icon">&gt;</span>Player view</button><button className={`nav-item ${view === "builder" ? "active" : "muted"}`} onClick={() => setView("builder")}><span className="nav-icon">[]</span>Editor</button><button className={`nav-item ${view === "settings" ? "active" : "muted"}`} onClick={() => setView("settings")}><span className="nav-icon">i</span>Questionnaire settings</button></nav>
        <div className="sidebar-bottom"><div className="completion"><div className="completion-row"><span>Study completion</span><strong>{Math.round((totalQuestions / 8) * 100)}%</strong></div><div className="progress"><span style={{ width: `${Math.min((totalQuestions / 8) * 100, 100)}%` }} /></div><small>{totalQuestions} of 8 recommended questions</small></div><div className="user-chip"><span className="avatar">AR</span><span><strong>Alex Rivera</strong><small>Researcher</small></span><span className="more">...</span></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><div><span className="breadcrumb">{view === "library" || view === "player" ? "Workspace /" : `Questionnaires / ${study.name || "Untitled questionnaire"} /`}</span> <strong>{view === "library" ? "All questionnaires" : view === "player" ? "Participant questionnaires" : view === "builder" ? "Editor" : view === "settings" ? "Questionnaire settings" : view === "player-preview" ? "Participant session" : "Participant preview"}</strong></div><div className="top-actions"><span className={`save-state ${published ? "published" : ""}`}><span className="status-dot" />{published ? "Published" : "All changes saved"}</span>{view === "builder" && <button className="preview-button" onClick={() => setView("preview")}>Preview questionnaire<span>{"->"}</span></button>}{view === "preview" && <button className="preview-button" onClick={() => setView("builder")}>Back to editor<span>{"->"}</span></button>}{view === "settings" && <button className="preview-button" onClick={() => setView("builder")}>Back to editor<span>{"->"}</span></button>}{view !== "library" && view !== "player" && view !== "player-preview" && <button className="publish-button" onClick={publishStudy}>{published ? "Published" : "Publish questionnaire"}<span>^</span></button>}</div></header>

        {view === "library" ? <QuestionnaireLibrary questionnaires={studySummaries} onOpen={openQuestionnaire} onCreate={createQuestionnaire} onExport={exportQuestionnaire} onImport={() => importInputRef.current?.click()} error={publishError} /> : view === "player" ? <PlayerLibrary questionnaires={studySummaries} onStart={startPlayer} /> : view === "player-preview" && playerStudy && playerQuestions ? <ParticipantPreview questions={playerQuestions} study={playerStudy} onBack={() => setView("player")} onComplete={saveParticipantResponse} /> : view === "preview" ? <ParticipantPreview questions={questions} study={study} onBack={() => setView("builder")} /> : view === "settings" ? <StudySettings study={study} updateStudy={updateStudy} error={publishError} /> : <>
          <div className="page-heading"><div><div className="overline">QUESTIONNAIRE BUILDER</div><h1>Build your study</h1><p>Structure the moments that turn gameplay into evidence.</p></div><div className="heading-meta"><span className="meta-icon">{study.name.slice(0, 1).toUpperCase() || "S"}</span><div><strong>{study.name || "Untitled study"}</strong><span>{study.gameName || "Serious game evaluation"}</span></div><button className="edit-title" onClick={() => setView("settings")}>Edit</button></div></div>
          <div className="builder-layout">
            <div className="section-column"><div className="column-heading"><div><span className="overline">STUDY FLOW</span><h2>Sections</h2></div><button className="icon-button" aria-label="Add section">+</button></div><div className="section-list">{(Object.keys(sectionInfo) as SectionKey[]).map((section) => <button key={section} className={`section-card ${activeSection === section ? "selected" : ""}`} onClick={() => selectSection(section)}><span className="section-number">{sectionInfo[section].eyebrow}</span><span className="section-copy"><strong>{sectionInfo[section].label}</strong><small>{sectionInfo[section].detail}</small></span><span className="section-count">{questions[section].length}</span></button>)}</div><div className="flow-note"><span className="spark">*</span><div><strong>One test, two moments</strong><p>The knowledge test is authored once, then reused after play with randomized question and answer order.</p></div></div></div>
            <div className="question-column"><div className="column-heading"><div><span className="overline">{sectionInfo[activeSection].eyebrow} / {activeSection}</span><h2>{sectionInfo[activeSection].label} questions</h2></div><button className="add-question" onClick={addQuestion}>+ Add question</button></div><div className="question-list">{activeQuestions.map((question) => <button key={question.id} className={`question-row ${selected?.id === question.id ? "selected" : ""}`} onClick={() => setSelectedId(question.id)}><span className="drag">::</span><span className="question-index">{String(activeQuestions.indexOf(question) + 1).padStart(2, "0")}</span><span className="question-summary"><strong>{question.text}</strong><small>{question.id} <i /> {question.type}{question.objective && <><i /> Learning measure</>}</small></span><span className="required-pill">{question.required ? "Required" : "Optional"}</span><span className="row-arrow">{"->"}</span></button>)}</div></div>
            <div className="inspector"><div className="inspector-head"><div><span className="overline">QUESTION DETAILS</span><h2>{selected?.id ?? "New question"}</h2></div><button className="more-button">...</button></div>{selected && <><label className="field-label">Question text<textarea value={selected.text} onChange={(event) => updateQuestion("text", event.target.value)} /></label><div className="field-grid"><label className="field-label">Question ID<input value={selected.id} onChange={(event) => updateQuestion("id", event.target.value)} /></label><label className="field-label">Question type<select value={selected.type} onChange={(event) => updateQuestion("type", event.target.value)}><option>Multiple choice</option><option>Likert scale</option><option>Short answer</option></select></label></div><label className="toggle-field"><span><strong>Required question</strong><small>Participants must answer this to continue</small></span><button className={`toggle ${selected.required ? "on" : ""}`} onClick={() => updateQuestion("required", !selected.required)} aria-label="Toggle required"><span /></button></label>{selected.type !== "Short answer" && <div className="metadata-block options-block"><div className="metadata-title"><span>Answer options</span><small>{selected.options.length} choices</small></div>{selected.options.map((option, optionIndex) => <div className={`option-editor ${selected.correct === option ? "correct-option" : ""}`} key={`${selected.id}-option-${optionIndex}`}><button type="button" className={`correct-toggle ${selected.correct === option ? "on" : ""}`} onClick={() => setCorrectOption(option)} aria-label={`${selected.correct === option ? "Unset" : "Set"} correct answer for option ${optionIndex + 1}`}>{selected.correct === option ? "OK" : ""}</button><span>{String.fromCharCode(65 + optionIndex)}</span><input value={option} onChange={(event) => updateOption(optionIndex, event.target.value)} aria-label={`Option ${optionIndex + 1}`} /><button type="button" onClick={() => removeOption(optionIndex)} aria-label={`Remove option ${optionIndex + 1}`}>x</button></div>)}<button type="button" className="add-option" onClick={addOption}>+ Add answer option</button></div>}<div className="metadata-block"><div className="metadata-title"><span>Learning metadata</span><small>Used for future learning-gain analysis</small></div><label className="field-label">Learning objective<input value={selected.objective} onChange={(event) => updateQuestion("objective", event.target.value)} placeholder="e.g. Identify phishing attempts" /></label><div className="field-grid"><label className="field-label">Bloom level<select value={selected.bloom} onChange={(event) => updateQuestion("bloom", event.target.value)}><option value="">Not specified</option><option>Remembering</option><option>Understanding</option><option>Applying</option><option>Analysing</option><option>Evaluating</option><option>Creating</option></select></label><label className="field-label">Correct answer<select value={selected.correct} onChange={(event) => updateQuestion("correct", event.target.value)}><option value="">No correct answer</option>{selected.options.map((option) => <option key={`correct-${option}`} value={option}>{option}</option>)}</select></label></div><label className="field-label">Pre / post pair<input value={selected.pair} onChange={(event) => updateQuestion("pair", event.target.value)} placeholder="e.g. POST_Q_01" /></label></div><div className="metadata-block glee-block"><div className="metadata-title"><span>GLEE construct</span><small>Optional experience measure</small></div><label className="field-label"><select value={selected.construct} onChange={(event) => updateQuestion("construct", event.target.value)}>{constructOptions.map((option) => <option key={option} value={option}>{option || "No construct linked"}</option>)}</select></label></div></>}</div>
          </div>
        </>}
      </section>
      <input ref={importInputRef} className="file-input" type="file" accept="application/json,.json" onChange={importQuestionnaire} />
    </main>
  );
}

function QuestionnaireLibrary({ questionnaires, onOpen, onCreate, onExport, onImport, error }: { questionnaires: StudySummary[]; onOpen: (id: string) => void; onCreate: () => void; onExport: () => void; onImport: () => void; error: string }) {
  return <div className="library-wrap"><div className="library-heading"><div><span className="overline">GLEE WORKSPACE</span><h1>Your questionnaires</h1><p>One evaluation questionnaire for each educational game.</p></div><div className="library-actions"><button className="secondary-action" onClick={onImport}>Load JSON</button><button className="secondary-action" onClick={onExport}>Save current JSON</button><button className="create-study-button" onClick={onCreate}>+ New questionnaire</button></div></div>{error && <div className="settings-alert">{error}</div>}<div className="library-toolbar"><span>{questionnaires.length} questionnaires</span><span className="library-hint">Select a questionnaire to edit its Background, Knowledge test, and Game UX flow.</span></div><div className="study-grid">{questionnaires.map((questionnaire) => <button className="study-card" key={questionnaire.id} onClick={() => onOpen(questionnaire.id)}><div className="study-card-top"><span className="study-card-mark">{questionnaire.name.slice(0, 1).toUpperCase() || "Q"}</span><span className={`study-status ${questionnaire.status.toLowerCase()}`}>{questionnaire.status}</span></div><div className="study-card-copy"><h2>{questionnaire.name}</h2><p>{questionnaire.description || "No game description yet"}</p></div><div className="study-card-meta"><span>{questionnaire.questions} questions</span><span>Updated {questionnaire.updated}</span><span className="card-arrow">{"->"}</span></div></button>)}<button className="new-study-card" onClick={onCreate}><span>+</span><strong>Evaluate another game</strong><small>Create a separate questionnaire</small></button></div></div>;
}

function PlayerLibrary({ questionnaires, onStart }: { questionnaires: StudySummary[]; onStart: (id: string) => void }) {
  return <div className="player-library-wrap"><div className="player-library-heading"><span className="overline">PARTICIPANT SPACE</span><h1>Choose a questionnaire</h1><p>Select the educational game evaluation you have been invited to complete.</p></div><div className="player-questionnaire-grid">{questionnaires.map((questionnaire) => <button className="player-questionnaire-card" key={questionnaire.id} onClick={() => onStart(questionnaire.id)}><span className="player-card-mark">{questionnaire.name.slice(0, 1).toUpperCase() || "Q"}</span><div><h2>{questionnaire.name}</h2><p>{questionnaire.description || "Serious game evaluation"}</p><small>{questionnaire.questions} questions · {questionnaire.status === "Published" ? "Available now" : "Preview study"}</small></div><span className="player-card-arrow">{"->"}</span></button>)}</div></div>;
}

function StudySettings({ study, updateStudy, error }: { study: Study; updateStudy: (field: keyof Study, value: string | boolean) => void; error: string }) {
  return <div className="settings-wrap"><div className="settings-heading"><div><span className="overline">STUDY SETTINGS</span><h1>Shape the study</h1><p>Give participants the context they need, and keep the evaluation flow consistent.</p></div><span className="settings-badge">GLEE / MVP</span></div>{error && <div className="settings-alert">{error}</div>}<div className="settings-grid"><div className="settings-main"><section className="settings-card"><div className="settings-card-heading"><div><span className="settings-number">01</span><h2>Study overview</h2></div><span>Visible to participants</span></div><label className="field-label">Study name<input value={study.name} onChange={(event) => updateStudy("name", event.target.value)} placeholder="e.g. Phishing Quest" /></label><label className="field-label">Description<textarea value={study.description} onChange={(event) => updateStudy("description", event.target.value)} /></label><div className="field-grid"><label className="field-label">Game name<input value={study.gameName} onChange={(event) => updateStudy("gameName", event.target.value)} /></label><label className="field-label">Estimated duration<input value={study.duration} onChange={(event) => updateStudy("duration", event.target.value)} placeholder="e.g. 20 minutes" /></label></div></section><section className="settings-card"><div className="settings-card-heading"><div><span className="settings-number">02</span><h2>Participant welcome</h2></div><span>Shown before Background</span></div><label className="field-label">Introduction text<textarea value={study.welcomeText} onChange={(event) => updateStudy("welcomeText", event.target.value)} /></label><label className="field-label">Game instructions<textarea value={study.gameInstructions} onChange={(event) => updateStudy("gameInstructions", event.target.value)} /></label></section></div><div className="settings-side"><section className="settings-card"><div className="settings-card-heading"><div><span className="settings-number">03</span><h2>Participant access</h2></div></div><label className="setting-toggle"><span><strong>Anonymous participation</strong><small>Do not require names or email addresses</small></span><button className={`toggle ${study.anonymous ? "on" : ""}`} onClick={() => updateStudy("anonymous", !study.anonymous)} aria-label="Toggle anonymous participation"><span /></button></label><label className="setting-toggle"><span><strong>Require consent</strong><small>Ask for agreement before starting</small></span><button className={`toggle ${study.consentRequired ? "on" : ""}`} onClick={() => updateStudy("consentRequired", !study.consentRequired)} aria-label="Toggle consent requirement"><span /></button></label></section><section className="settings-card"><div className="settings-card-heading"><div><span className="settings-number">04</span><h2>Study flow</h2></div></div><div className="flow-setting"><span className="flow-icon">01</span><div><strong>Background</strong><small>Before the knowledge test</small></div><span className="flow-fixed">ON</span></div><div className="flow-setting"><span className="flow-icon">02</span><div><strong>Knowledge test</strong><small>Before and after game play</small></div><span className="flow-fixed">2x</span></div><div className="flow-setting"><span className="flow-icon">03</span><div><strong>Game UX</strong><small>After the game session</small></div><span className="flow-fixed">ON</span></div><div className="display-mode-setting"><span><strong>Participant display</strong><small>Choose whether answers stay focused or appear by section</small></span><select value={study.displayMode} onChange={(event) => updateStudy("displayMode", event.target.value as Study["displayMode"])}><option value="one-at-a-time">One question at a time</option><option value="section">Entire section</option></select></div><label className="setting-toggle flow-toggle"><span><strong>Randomize post-test</strong><small>Shuffle questions and answer options</small></span><button className={`toggle ${study.postTestRandomized ? "on" : ""}`} onClick={() => updateStudy("postTestRandomized", !study.postTestRandomized)} aria-label="Toggle post-test randomization"><span /></button></label></section></div></div></div>;
}

function buildParticipantResponse(study: Study, questions: Record<SectionKey, Question[]>, answers: Record<string, string>): ParticipantResponseExport {
  const responseAnswers: ParticipantResponseExport["answers"] = { BACKGROUND: {}, PRE_TEST: {}, POST_TEST: {}, GAME_UX: {} };
  Object.entries(answers).forEach(([key, value]) => {
    const separator = key.indexOf(":");
    const phase = key.slice(0, separator);
    const questionId = key.slice(separator + 1);
    if (phase === "background") responseAnswers.BACKGROUND[questionId] = value;
    if (phase === "pre-test") responseAnswers.PRE_TEST[questionId] = value;
    if (phase === "post-test") responseAnswers.POST_TEST[questionId] = value;
    if (phase === "game-ux") responseAnswers.GAME_UX[questionId] = value;
  });
  return { format: "glee-participant-response", formatVersion: 1, responseId: `response-${Date.now()}`, submittedAt: new Date().toISOString(), questionnaire: { id: study.id, name: study.name, gameName: study.gameName, description: study.description, questions }, answers: responseAnswers, presentation: { displayMode: study.displayMode, postTestRandomized: study.postTestRandomized } };
}

function SectionParticipantPreview({ questions, study, onBack, onComplete }: { questions: Record<SectionKey, Question[]>; study: Study; onBack: () => void; onComplete?: (response: ParticipantResponseExport) => void }) {
  const [items] = useState<SectionStep[]>(() => {
    const source = createPreviewItems(questions);
    const grouped: SectionStep[] = [];
    source.forEach((item) => {
      if (item.kind === "game") { grouped.push(item); return; }
      const previous = grouped[grouped.length - 1];
      if (previous?.kind === "section" && previous.phase === item.phase) previous.questions.push(item.question);
      else grouped.push({ kind: "section", questions: [item.question], section: item.section, phase: item.phase });
    });
    return grouped;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const currentItem = items[currentIndex];
  const questionsInStep = currentItem.kind === "game" ? [] : currentItem.questions;
  const progress = submitted ? 100 : ((currentIndex + 1) / items.length) * 100;
  const phaseLabel = currentItem.kind === "game" ? "Game session" : sectionInfo[currentItem.section].label;

  function answerKey(question: Question) { return `${currentItem.kind === "section" ? currentItem.phase : "game"}:${question.id}`; }
  function updateAnswer(question: Question, value: string) { setAnswers((current) => ({ ...current, [answerKey(question)]: value })); setError(""); }
  function continuePreview() {
    const missing = questionsInStep.find((question) => question.required && !answers[answerKey(question)]?.trim());
    if (missing) { setError("Please answer all required questions before continuing."); return; }
    if (currentIndex === items.length - 1) { onComplete?.(buildParticipantResponse(study, questions, answers)); setSubmitted(true); return; }
    setCurrentIndex((current) => current + 1); setError("");
  }

  return <div className="preview-wrap"><div className="preview-top"><div><span className="overline">PARTICIPANT VIEW</span><h1>{study.name}</h1><p>{study.description || "A serious game evaluation questionnaire."}</p></div><button className="preview-close" onClick={onBack}>Close preview</button></div><div className="participant-card"><div className="participant-progress"><span>{submitted ? "Complete" : phaseLabel}</span><span>{submitted ? "Response saved" : `Section step ${currentIndex + 1} of ${items.length}`}</span></div><div className="participant-line"><span style={{ width: `${progress}%` }} /></div>{submitted ? <div className="participant-content completion-content"><span className="success-mark">OK</span><span className="overline">RESPONSE JSON DOWNLOADED</span><h2>Thank you for taking part.</h2><p>Your response file contains separate Background, pre-test, post-test, and Game UX answers for later analysis.</p><button className="continue-button" onClick={onBack}>Return to player list <span>{"->"}</span></button></div> : <div className="participant-content"><span className="overline">{currentItem.kind === "game" ? "PLAY THE SERIOUS GAME" : currentItem.phase === "pre-test" ? "PRE-TEST" : currentItem.phase === "post-test" ? "POST-TEST / RANDOMIZED" : currentItem.phase === "game-ux" ? "GAME EXPERIENCE" : "WELCOME"}</span><h2>{currentItem.kind === "game" ? "Your game session starts here." : phaseLabel}</h2><p>{currentItem.kind === "game" ? "In the live study, the participant plays the educational game before returning for the post-test." : "Answer each question as honestly as you can. You can review the questions in this section before continuing."}</p>{currentItem.kind === "section" && <div className="section-preview-list">{questionsInStep.map((question) => <div className="preview-question" key={`${currentItem.phase}:${question.id}`}><strong>{question.text}</strong>{question.type === "Short answer" ? <textarea className="preview-textarea" value={answers[answerKey(question)] ?? ""} onChange={(event) => updateAnswer(question, event.target.value)} placeholder="Type your answer..." /> : question.options.map((option) => <label key={option} className={`answer-option ${answers[answerKey(question)] === option ? "chosen" : ""}`}><input type="radio" name={answerKey(question)} value={option} checked={answers[answerKey(question)] === option} onChange={(event) => updateAnswer(question, event.target.value)} /> <span>{option}</span></label>)}</div>)}</div>}{error && <p className="answer-error">{error}</p>}<button className="continue-button" onClick={continuePreview}>{currentItem.kind === "game" ? "Return from game" : currentIndex === items.length - 1 ? "Submit response" : "Continue"} <span>{"->"}</span></button></div>}</div></div>;
}

type SectionStep =
  | { kind: "section"; questions: Question[]; section: SectionKey; phase: "background" | "pre-test" | "post-test" | "game-ux" }
  | { kind: "game"; id: "GAME_SESSION"; section: "GAME"; phase: "game" };

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

function ParticipantPreview({ questions, study, onBack, onComplete }: { questions: Record<SectionKey, Question[]>; study: Study; onBack: () => void; onComplete?: (response: ParticipantResponseExport) => void }) {
  if (study.displayMode === "section") return <SectionParticipantPreview questions={questions} study={study} onBack={onBack} onComplete={onComplete} />;
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
      onComplete?.(buildParticipantResponse(study, questions, answers));
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

  return <div className="preview-wrap"><div className="preview-top"><div><span className="overline">PARTICIPANT VIEW</span><h1>{study.name}</h1><p>{study.description || "A serious game evaluation questionnaire."}</p></div><button className="preview-close" onClick={onBack}>Close preview</button></div><div className="participant-card"><div className="participant-progress"><span>{submitted ? "Complete" : phaseLabel}</span><span>{submitted ? "Response saved" : `Step ${currentIndex + 1} of ${items.length}`}</span></div><div className="participant-line"><span style={{ width: `${progress}%` }} /></div>{submitted ? <div className="participant-content completion-content"><span className="success-mark">OK</span><span className="overline">RESPONSE JSON DOWNLOADED</span><h2>Thank you for taking part.</h2><p>Your response file contains separate Background, pre-test, post-test, and Game UX answers for later analysis.</p><button className="continue-button" onClick={onBack}>Return to questionnaire <span>{"->"}</span></button></div> : <div className={`participant-content ${currentItem.kind === "game" ? "game-session-content" : ""}`}><span className="overline">{phaseOverline}</span><h2>{heading}</h2><p>{description}</p>{currentQuestion && <div className="preview-question" key={`${currentItem.phase}:${currentQuestion.id}`}><strong>{currentQuestion.text}</strong>{currentQuestion.type === "Short answer" ? <textarea className="preview-textarea" value={answers[answerKey] ?? ""} onChange={(event) => updateAnswer(event.target.value)} placeholder="Type your answer..." /> : currentQuestion.options.map((option) => <label key={option} className={`answer-option ${answers[answerKey] === option ? "chosen" : ""}`}><input type="radio" name={answerKey} value={option} checked={answers[answerKey] === option} onChange={(event) => updateAnswer(event.target.value)} /> <span>{option}</span></label>)}</div>}{error && <p className="answer-error">{error}</p>}<button className="continue-button" onClick={continuePreview}>{currentItem.kind === "game" ? "Return from game" : currentIndex === items.length - 1 ? "Submit response" : "Continue"} <span>{"->"}</span></button></div>}</div></div>;
}
