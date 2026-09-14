"use client";

import { useEffect, useRef, useState } from "react";
import QuestionnaireLibrary from "../components/QuestionnaireLibrary";
import PlayerLibrary from "../components/PlayerLibrary";
import { buildParticipantResponse } from "../lib/participant";
import {
  constructAliases,
  constructOptions,
  dashboardGroups,
  initialQuestions,
  initialStudy,
  initialStudySummaries,
  normalizeQuestionnaireConstruct,
  sectionInfo,
  type ConstructMetric,
  type ParticipantResponseExport,
  type QuestionnaireExport,
  type QuestionnaireRecord,
  type Question,
  type SectionKey,
  type Study,
  type StudySummary,
} from "../lib/study-model";

export default function Home() {
  const [activeSection, setActiveSection] = useState<SectionKey>("TEST");
  const [questions, setQuestions] = useState(initialQuestions);
  const [selectedId, setSelectedId] = useState("TEST_Q_01");
  const [view, setView] = useState<"library" | "builder" | "preview" | "settings" | "player" | "player-preview" | "dashboard">("library");
  const [studyPickerOpen, setStudyPickerOpen] = useState(false);
  const [published, setPublished] = useState(false);
  const [study, setStudy] = useState(initialStudy);
  const [studySummaries, setStudySummaries] = useState(initialStudySummaries);
  const [questionnaireStore, setQuestionnaireStore] = useState<Record<string, QuestionnaireRecord>>({
    [initialStudy.id]: { study: initialStudy, questions: initialQuestions, published: false },
  });
  const [publishError, setPublishError] = useState("");
  const [creationSuccess, setCreationSuccess] = useState("");
  const [playerStudy, setPlayerStudy] = useState<Study | null>(null);
  const [playerQuestions, setPlayerQuestions] = useState<Record<SectionKey, Question[]> | null>(null);
  const [dashboardResponses, setDashboardResponses] = useState<ParticipantResponseExport[]>([]);
  const [dashboardStudyId, setDashboardStudyId] = useState(initialStudy.id);
  const [dashboardError, setDashboardError] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);
  const responseImportInputRef = useRef<HTMLInputElement>(null);

  const activeQuestions = questions[activeSection];
  const selected = activeQuestions.find((question) => question.id === selectedId) ?? activeQuestions[0];
  const totalQuestions = Object.values(questions).flat().length;

  useEffect(() => {
    setQuestionnaireStore((current) => ({ ...current, [study.id]: { study, questions, published } }));
  }, [study, questions, published]);

  useEffect(() => {
    async function loadSavedStudies() {
      try {
        const response = await fetch("/api/studies");
        const data = await response.json().catch(() => null);
        if (!response.ok || !Array.isArray(data?.studies)) {
          return;
        }

        const savedRecords = (data.studies as Record<string, any>[]).reduce<Record<string, QuestionnaireRecord>>(
          (acc: Record<string, QuestionnaireRecord>, item: Record<string, any>) => {
            const savedStudy: Study = {
              id: String(item.id ?? ""),
              name: String(item.name ?? "Untitled questionnaire"),
              description: String(item.description ?? ""),
              gameName: String(item.gameName ?? ""),
              gameInstructions: String(item.gameInstructions ?? ""),
              duration: String(item.duration ?? ""),
              welcomeText: String(item.welcomeText ?? ""),
              anonymous: Boolean(item.anonymous),
              consentRequired: Boolean(item.consentRequired),
              postTestRandomized: Boolean(item.postTestRandomized),
              displayMode: item.displayMode === "section" ? "section" : "one-at-a-time",
            };

            const savedQuestions: Record<SectionKey, Question[]> = {
              BACKGROUND: Array.isArray(item.questions?.BACKGROUND) ? (item.questions.BACKGROUND as Question[]) : [],
              TEST: Array.isArray(item.questions?.TEST) ? (item.questions.TEST as Question[]) : [],
              GAME_UX: Array.isArray(item.questions?.GAME_UX) ? (item.questions.GAME_UX as Question[]) : [],
            };

            acc[savedStudy.id] = {
              study: savedStudy,
              questions: savedQuestions,
              published: Boolean(item.published),
            };

            return acc;
          },
          {} as Record<string, QuestionnaireRecord>
        );

        const savedSummaries: StudySummary[] = (Object.values(savedRecords) as QuestionnaireRecord[]).map((record) => ({
          id: record.study.id,
          name: record.study.name,
          description: record.study.description || "No game description yet",
          status: record.published ? "Published" : "Draft",
          updated: "Just now",
          questions: Object.values(record.questions).flat().length,
        }));

        setQuestionnaireStore((current) => ({ ...current, ...savedRecords }));
        setStudySummaries(savedSummaries.length ? savedSummaries : initialStudySummaries);
      } catch {
        setStudySummaries((current) => current.length ? current : initialStudySummaries);
      }
    }

    loadSavedStudies();
  }, []);

  useEffect(() => {
    document.body.dataset.activeSection = activeSection;
    return () => {
      delete document.body.dataset.activeSection;
    };
  }, [activeSection]);

  useEffect(() => {
  if (!creationSuccess) return;
  const timer = setTimeout(() => setCreationSuccess(""), 3000);
  return () => clearTimeout(timer);
}, [creationSuccess]);

  function updateQuestion(field: keyof Question, value: string | boolean) {
    if (field === "construct") value = activeSection === "TEST" ? "Learning Gain" : activeSection === "BACKGROUND" ? "" : String(value);
    if (field === "correct" && activeSection !== "TEST") value = "";
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
    if (activeSection !== "TEST") return;
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
    const newQuestion: Question = { id: `${prefix}_${String(nextNumber).padStart(2, "0")}`, text: "Untitled question", type: "Multiple choice", required: false, objective: "", bloom: "", correct: "", pair: "", construct: activeSection === "TEST" ? "Learning Gain" : "", options: ["Option 1", "Option 2"] };
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
    const defaultQuestions: Record<SectionKey, Question[]> = {
      BACKGROUND: [
        { id: `BG_${Date.now()}_01`, text: "How often do you play digital games?", type: "Multiple choice", required: true, objective: "", bloom: "", correct: "", pair: "", construct: "", options: ["Daily", "A few times a week", "A few times a month", "Rarely"] },
      ],
      TEST: [
        { id: `TEST_${Date.now()}_01`, text: "Which action should you take when you encounter a suspicious email?", type: "Multiple choice", required: true, objective: "Identify phishing attempts", bloom: "Applying", correct: "Report it and avoid opening links", pair: "", construct: "Learning Gain", options: ["Reply to ask who sent it", "Report it and avoid opening links", "Forward it to a friend", "Download the attachment"] },
      ],
      GAME_UX: [
        { id: `UX_${Date.now()}_01`, text: "I was fully absorbed in the game.", type: "Likert scale", required: true, objective: "", bloom: "", correct: "", pair: "", construct: "Immersion", options: ["1 - Completely disagree", "2 - Disagree", "3 - Slightly disagree", "4 - Neutral / neither agree nor disagree", "5 - Slightly agree", "6 - Agree", "7 - Completely agree"] },
      ],
    };

    setStudy(newStudy);
    setQuestions(defaultQuestions);
    setActiveSection("TEST");
    setSelectedId(defaultQuestions.TEST[0]?.id ?? "");
    setPublished(false);
    setQuestionnaireStore((current) => ({ ...current, [newStudy.id]: { study: newStudy, questions: defaultQuestions, published: false } }));
    setStudySummaries((current) => [{ id: newStudy.id, name: newStudy.name, description: "New educational game evaluation", status: "Draft", updated: "Just now", questions: Object.values(defaultQuestions).flat().length }, ...current]);
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

  function selectWorkingQuestionnaire(id: string) {
    const summary = studySummaries.find((item) => item.id === id);
    if (!summary) return;
    const record = questionnaireStore[id];
    setStudy(record?.study ?? { ...initialStudy, id: summary.id, name: summary.name, description: summary.description, gameName: summary.name });
    setQuestions(record?.questions ?? { BACKGROUND: [], TEST: [], GAME_UX: [] });
    setPublished(record?.published ?? summary.status === "Published");
    setActiveSection("TEST");
    setSelectedId(record?.questions.TEST[0]?.id ?? "");
    setDashboardStudyId(id);
    setStudyPickerOpen(false);
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
        const importedQuestions: Record<SectionKey, Question[]> = {
          BACKGROUND: (parsed.questions.BACKGROUND ?? []).map((question) => ({ ...question, correct: "", construct: "" })),
          TEST: (parsed.questions.TEST ?? []).map((question) => ({ ...question, construct: "Learning Gain" })),
          GAME_UX: (parsed.questions.GAME_UX ?? []).map((question) => ({ ...question, correct: "", construct: normalizeQuestionnaireConstruct(question.construct) })),
        };
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

  async function publishStudy() {
    setCreationSuccess("");
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

    const payload = {
      id: study.id,
      name: study.name,
      description: study.description,
      gameName: study.gameName,
      gameInstructions: study.gameInstructions,
      duration: study.duration,
      welcomeText: study.welcomeText,
      anonymous: study.anonymous,
      consentRequired: study.consentRequired,
      postTestRandomized: study.postTestRandomized,
      displayMode: study.displayMode,
      questions,
      published,
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Could not save this study to the database.");
      }

      setStudySummaries((current) => current.map((item) => item.id === study.id ? { ...item, name: study.name, description: study.description || "No game description yet", status: published ? "Published" : "Draft", updated: "Just now", questions: Object.values(questions).flat().length } : item));
      setPublishError("");
      setCreationSuccess(`${study.name} was saved successfully.`);
      setView("builder");
    } catch (error) {
      setPublished(false);
      setPublishError(error instanceof Error ? error.message : "Could not save this study to the database.");
      setView("settings");
    }
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

  async function saveParticipantResponse(response: ParticipantResponseExport) {
    try {
      const databaseResponse = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      });
      if (!databaseResponse.ok) {
        throw new Error("Could not save participant response to MongoDB.");
      }
    } catch (error) {
      console.error("Participant response database save failed:", error);
    }

    const blob = new Blob([JSON.stringify(response, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${response.questionnaire.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "questionnaire"}-response-${response.responseId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function openDashboard(id: string) {
    setDashboardStudyId(id);
    setDashboardResponses([]);
    setDashboardError("");
    setView("dashboard");
    try {
      const response = await fetch(`/api/responses?questionnaireId=${encodeURIComponent(id)}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(data?.responses)) {
        throw new Error(data?.error || "Could not load responses from MongoDB.");
      }
      setDashboardResponses(data.responses as ParticipantResponseExport[]);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Could not load responses from MongoDB.");
    }
  }

  async function importResponses(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const loaded: ParticipantResponseExport[] = [];
    for (const file of files) {
      try {
        const parsed = JSON.parse(await file.text()) as ParticipantResponseExport;
        if (parsed.format !== "glee-participant-response" || parsed.formatVersion !== 1 || !parsed.questionnaire?.id || !parsed.questionnaire.questions || !parsed.answers) continue;
        loaded.push(parsed);
      } catch {
        // Ignore malformed files and keep valid response files usable.
      }
    }
    const selectedStudy = questionnaireStore[dashboardStudyId]?.study ?? (dashboardStudyId === initialStudy.id ? initialStudy : study);
    const normalizeStudyName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
    const matching = loaded.filter((response) => response.questionnaire.id === dashboardStudyId || normalizeStudyName(response.questionnaire.name) === normalizeStudyName(selectedStudy.name));
    setDashboardResponses(matching);
    setDashboardError(matching.length ? "" : "No valid responses for this questionnaire were found in the selected files.");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">AP</span><span>GLEE <small>studio</small></span></div>
        <nav className="main-nav top-level-nav"><button className={`nav-item ${view === "library" ? "active" : "muted"}`} onClick={() => setView("library")}><span className="nav-icon">::</span>Questionnaires <b>{studySummaries.length}</b></button><button className={`nav-item ${view === "player" ? "active" : "muted"}`} onClick={() => setView("player")}><span className="nav-icon">&gt;</span>Player view</button></nav>
        <div className="workspace-label">Workspace</div>
        <div className="study-picker"><button className="study-mini" onClick={() => setStudyPickerOpen((current) => !current)} aria-expanded={studyPickerOpen}><div className="study-dot">{study.name.slice(0, 1).toUpperCase() || "S"}</div><div><strong>{study.name || "Untitled questionnaire"}</strong><span>{published ? "Published" : "Draft questionnaire"}</span></div><span className="chevron">{studyPickerOpen ? "^" : "v"}</span></button>{studyPickerOpen && <div className="study-picker-menu">{studySummaries.map((questionnaire) => <button key={questionnaire.id} className={`study-picker-option ${questionnaire.id === study.id ? "selected" : ""}`} onClick={() => selectWorkingQuestionnaire(questionnaire.id)}><span className="study-picker-mark">{questionnaire.name.slice(0, 1).toUpperCase() || "S"}</span><span><strong>{questionnaire.name}</strong><small>{questionnaire.status} · {questionnaire.questions} questions</small></span></button>)}</div>}</div>
        <nav className="main-nav sub-nav"><button className={`nav-item ${view === "settings" ? "active" : "muted"}`} onClick={() => setView("settings")}><span className="nav-icon">i</span>Info</button><button className={`nav-item ${view === "builder" ? "active" : "muted"}`} onClick={() => setView("builder")}><span className="nav-icon">[]</span>Editor</button><button className={`nav-item ${view === "dashboard" ? "active" : "muted"}`} onClick={() => openDashboard(study.id)}><span className="nav-icon">%</span>Dashboard</button></nav>
        <div className="sidebar-bottom"><div className="user-chip"><span className="avatar">AR</span><span><strong>Alex Rivera</strong><small>Researcher</small></span><span className="more">...</span></div></div>
      </aside>

      <section className="workspace">
        {creationSuccess && <div className="creation-success" role="status">{creationSuccess}</div>}
        <header className="topbar"><div><span className="breadcrumb">{view === "library" || view === "player" ? "Workspace /" : `Questionnaires / ${study.name || "Untitled questionnaire"} /`}</span> <strong>{view === "library" ? "All questionnaires" : view === "player" ? "Participant questionnaires" : view === "dashboard" ? "Dashboard" : view === "builder" ? "Editor" : view === "settings" ? "Questionnaire settings" : view === "player-preview" ? "Participant session" : "Participant preview"}</strong></div><div className="top-actions"><span className={`save-state ${published ? "published" : ""}`}><span className="status-dot" />{published ? "Published" : "All changes saved"}</span>{view === "builder" && <button className="preview-button" onClick={() => setView("preview")}>Preview questionnaire<span>{"->"}</span></button>}{view === "preview" && <button className="preview-button" onClick={() => setView("builder")}>Back to editor<span>{"->"}</span></button>}{view === "settings" && <button className="preview-button" onClick={() => setView("builder")}>Back to editor<span>{"->"}</span></button>}{view === "dashboard" && <button className="preview-button" onClick={() => setView("library")}>Back to questionnaires<span>{"->"}</span></button>}{view !== "library" && view !== "player" && view !== "player-preview" && view !== "dashboard" && <button className="publish-button" onClick={publishStudy}>Save questionnaire<span>^</span></button>}</div></header>

        {view === "library" ? <QuestionnaireLibrary questionnaires={studySummaries} onOpen={openQuestionnaire} onCreate={createQuestionnaire} onExport={exportQuestionnaire} onImport={() => importInputRef.current?.click()} onDashboard={openDashboard} error={publishError} /> : view === "dashboard" ? <Dashboard study={questionnaireStore[dashboardStudyId]?.study ?? (dashboardStudyId === initialStudy.id ? initialStudy : study)} responses={dashboardResponses} error={dashboardError} onRefresh={() => openDashboard(dashboardStudyId)} onImport={() => responseImportInputRef.current?.click()} /> : view === "player" ? <PlayerLibrary questionnaires={studySummaries} onStart={startPlayer} /> : view === "player-preview" && playerStudy && playerQuestions ? <ParticipantPreview questions={playerQuestions} study={playerStudy} onBack={() => setView("player")} onComplete={saveParticipantResponse} /> : view === "preview" ? <ParticipantPreview questions={questions} study={study} onBack={() => setView("builder")} /> : view === "settings" ? <StudySettings study={study} published={published} updateStudy={updateStudy} onTogglePublished={() => setPublished((current) => !current)} error={publishError} /> : <>
          <div className="page-heading"><div><div className="overline">QUESTIONNAIRE BUILDER</div><h1>Build your study</h1><p>Structure the moments that turn gameplay into evidence.</p></div><div className="heading-meta"><span className="meta-icon">{study.name.slice(0, 1).toUpperCase() || "S"}</span><div><strong>{study.name || "Untitled study"}</strong><span>{study.gameName || "Serious game evaluation"}</span></div><button className="edit-title" onClick={() => setView("settings")}>Edit</button></div></div>
          <div className="builder-layout">
            <div className="section-column"><div className="column-heading"><div><span className="overline">STUDY FLOW</span><h2>Sections</h2></div><button className="icon-button" aria-label="Add section">+</button></div><div className="section-list">{(Object.keys(sectionInfo) as SectionKey[]).map((section) => <button key={section} className={`section-card ${activeSection === section ? "selected" : ""}`} onClick={() => selectSection(section)}><span className="section-number">{sectionInfo[section].eyebrow}</span><span className="section-copy"><strong>{sectionInfo[section].label}</strong><small>{sectionInfo[section].detail}</small></span><span className="section-count">{questions[section].length}</span></button>)}</div><div className="flow-note"><span className="spark">*</span><div><strong>One test, two moments</strong><p>The knowledge test is authored once, then reused after play with randomized question and answer order.</p></div></div></div>
            <div className="question-column"><div className="column-heading"><div><span className="overline">{sectionInfo[activeSection].eyebrow} / {activeSection}</span><h2>{sectionInfo[activeSection].label} questions</h2></div><button className="add-question" onClick={addQuestion}>+ Add question</button></div><div className="question-list">{activeQuestions.map((question) => <button key={question.id} className={`question-row ${selected?.id === question.id ? "selected" : ""}`} onClick={() => setSelectedId(question.id)}><span className="drag">::</span><span className="question-index">{String(activeQuestions.indexOf(question) + 1).padStart(2, "0")}</span><span className="question-summary"><strong>{question.text}</strong><small>{question.id} <i /> {question.type}{question.objective && <><i /> Learning measure</>}</small></span><span className="required-pill">{question.required ? "Required" : "Optional"}</span><span className="row-arrow">{"->"}</span></button>)}</div></div>
            <div className="inspector"><div className="inspector-head"><div><span className="overline">QUESTION DETAILS</span><h2>{selected?.id ?? "New question"}</h2></div><button className="more-button">...</button></div>{selected && <><label className="field-label">Question text<textarea value={selected.text} onChange={(event) => updateQuestion("text", event.target.value)} /></label><div className="field-grid"><label className="field-label">Question ID<input value={selected.id} onChange={(event) => updateQuestion("id", event.target.value)} /></label><label className="field-label">Question type<select value={selected.type} onChange={(event) => updateQuestion("type", event.target.value)}><option>Multiple choice</option><option>Likert scale</option><option>Short answer</option></select></label></div><label className="toggle-field"><span><strong>Required question</strong><small>Participants must answer this to continue</small></span><button className={`toggle ${selected.required ? "on" : ""}`} onClick={() => updateQuestion("required", !selected.required)} aria-label="Toggle required"><span /></button></label>{selected.type !== "Short answer" && <div className="metadata-block options-block"><div className="metadata-title"><span>Answer options</span><small>{selected.options.length} choices</small></div>{selected.options.map((option, optionIndex) => <div className={`option-editor ${selected.correct === option ? "correct-option" : ""}`} key={`${selected.id}-option-${optionIndex}`}><button type="button" className={`correct-toggle ${selected.correct === option ? "on" : ""}`} onClick={() => setCorrectOption(option)} aria-label={`${selected.correct === option ? "Unset" : "Set"} correct answer for option ${optionIndex + 1}`}>{selected.correct === option ? "OK" : ""}</button><span>{String.fromCharCode(65 + optionIndex)}</span><input value={option} onChange={(event) => updateOption(optionIndex, event.target.value)} aria-label={`Option ${optionIndex + 1}`} /><button type="button" onClick={() => removeOption(optionIndex)} aria-label={`Remove option ${optionIndex + 1}`}>x</button></div>)}<button type="button" className="add-option" onClick={addOption}>+ Add answer option</button></div>}<div className="metadata-block"><div className="metadata-title"><span>Learning metadata</span><small>Used for future learning-gain analysis</small></div><label className="field-label">Learning objective<input value={selected.objective} onChange={(event) => updateQuestion("objective", event.target.value)} placeholder="e.g. Identify phishing attempts" /></label><div className="field-grid"><label className="field-label">Bloom level<select value={selected.bloom} onChange={(event) => updateQuestion("bloom", event.target.value)}><option value="">Not specified</option><option>Remembering</option><option>Understanding</option><option>Applying</option><option>Analysing</option><option>Evaluating</option><option>Creating</option></select></label><label className="field-label">Correct answer<select value={selected.correct} onChange={(event) => updateQuestion("correct", event.target.value)}><option value="">No correct answer</option>{selected.options.map((option) => <option key={`correct-${option}`} value={option}>{option}</option>)}</select></label></div><label className="field-label">Pre / post pair<input value={selected.pair} onChange={(event) => updateQuestion("pair", event.target.value)} placeholder="e.g. POST_Q_01" /></label></div><div className="metadata-block glee-block"><div className="metadata-title"><span>GLEE construct</span><small>Optional experience measure</small></div><label className="field-label"><select value={selected.construct} onChange={(event) => updateQuestion("construct", event.target.value)}>{constructOptions.map((option) => <option key={option} value={option}>{option || "No construct linked"}</option>)}</select></label></div></>}</div>
          </div>
        </>}
      </section>
      <input ref={importInputRef} className="file-input" type="file" accept="application/json,.json" onChange={importQuestionnaire} />
      <input ref={responseImportInputRef} className="file-input" type="file" multiple accept="application/json,.json" onChange={importResponses} />
    </main>
  );
}

function parseLikertValue(answer: string) {
  const match = answer.trim().match(/^[1-7]/);
  return match ? Number(match[0]) : null;
}

function calculateConstructMetrics(responses: ParticipantResponseExport[]): ConstructMetric[] {
  const buckets = new Map<string, { total: number; answers: number; participants: Set<string> }>();
  responses.forEach((response) => {
    Object.entries(response.questionnaire.questions).forEach(([section, questions]) => {
      questions.forEach((question) => {
        if (question.type !== "Likert scale" || !question.construct) return;
        if (section === "TEST") return;
        const normalizedConstruct = constructAliases[question.construct.trim().toLowerCase().replace(/\s+/g, " ")];
        if (!normalizedConstruct) return;
        const phases = section === "TEST" ? ["PRE_TEST", "POST_TEST"] : [section];
        phases.forEach((phase) => {
          const answer = response.answers[phase as keyof ParticipantResponseExport["answers"]][question.id];
          const value = answer ? parseLikertValue(answer) : null;
          if (value === null) return;
          const bucket = buckets.get(normalizedConstruct) ?? { total: 0, answers: 0, participants: new Set<string>() };
          bucket.total += value;
          bucket.answers += 1;
          bucket.participants.add(response.responseId);
          buckets.set(normalizedConstruct, bucket);
        });
      });
    });
  });
  const allConstructs = [...dashboardGroups.design, ...dashboardGroups.experiential, ...dashboardGroups.subjective];
  return allConstructs.map((construct) => {
    const bucket = buckets.get(construct);
    return { construct, average: bucket ? bucket.total / bucket.answers : null, answers: bucket?.answers ?? 0, participants: bucket?.participants.size ?? 0 };
  });
}

function calculateLearningGain(responses: ParticipantResponseExport[]) {
  let preScoreTotal = 0;
  let postScoreTotal = 0;
  let scoredParticipants = 0;
  let questionCount = 0;
  function isCorrect(answer: string | undefined, question: Question) {
    if (!answer || !question.correct) return false;
    if (answer === question.correct) return true;
    const correctIndex = /^[A-G]$/i.test(question.correct) ? question.correct.toUpperCase().charCodeAt(0) - 65 : -1;
    return correctIndex >= 0 && question.options[correctIndex] === answer;
  }

  responses.forEach((response) => {
    const testQuestions = response.questionnaire.questions.TEST;
    const scoredQuestions = testQuestions.filter((question) => question.correct);
    if (!scoredQuestions.length) return;
    questionCount = Math.max(questionCount, scoredQuestions.length);
    preScoreTotal += scoredQuestions.filter((question) => isCorrect(response.answers.PRE_TEST[question.id], question)).length;
    postScoreTotal += scoredQuestions.filter((question) => isCorrect(response.answers.POST_TEST[question.id], question)).length;
    scoredParticipants += 1;
  });
  if (!scoredParticipants || !questionCount) return null;
  return { pre: preScoreTotal / scoredParticipants, post: postScoreTotal / scoredParticipants, gain: (postScoreTotal - preScoreTotal) / scoredParticipants, total: questionCount };
}

type BackgroundGainGroup = {
  question: string;
  answer: string;
  participants: number;
  pre: number;
  post: number;
  gain: number;
  preSd: number;
  postSd: number;
};

function calculateBackgroundLearningGain(responses: ParticipantResponseExport[]): BackgroundGainGroup[] {
  const groups = new Map<string, { question: string; answer: string; pre: number[]; post: number[] }>();
  responses.forEach((response) => {
    const testQuestions = response.questionnaire.questions.TEST.filter((question) => question.correct);
    const scored = (phase: "PRE_TEST" | "POST_TEST") => testQuestions.filter((question) => {
      const answer = response.answers[phase][question.id];
      if (answer === question.correct) return true;
      const index = /^[A-G]$/i.test(question.correct) ? question.correct.toUpperCase().charCodeAt(0) - 65 : -1;
      return index >= 0 && question.options[index] === answer;
    }).length;
    if (!testQuestions.length) return;
    const pre = scored("PRE_TEST");
    const post = scored("POST_TEST");
    response.questionnaire.questions.BACKGROUND.forEach((question) => {
      const answer = response.answers.BACKGROUND[question.id];
      if (!answer) return;
      const key = `${question.id}:${answer}`;
      const group = groups.get(key) ?? { question: question.text, answer, pre: [], post: [] };
      group.pre.push(pre);
      group.post.push(post);
      groups.set(key, group);
    });
  });
  const standardDeviation = (values: number[]) => {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
  };
  return Array.from(groups.values()).map((group) => {
    const pre = group.pre.reduce((sum, value) => sum + value, 0) / group.pre.length;
    const post = group.post.reduce((sum, value) => sum + value, 0) / group.post.length;
    return { question: group.question, answer: group.answer, participants: group.pre.length, pre, post, gain: post - pre, preSd: standardDeviation(group.pre), postSd: standardDeviation(group.post) };
  });
}

function BackgroundLearningGainPanel({ responses, study }: { responses: ParticipantResponseExport[]; study: Study }) {
  const groups = calculateBackgroundLearningGain(responses);
  const denominator = Math.max(1, responses[0]?.questionnaire.questions.TEST.filter((question) => question.correct).length ?? 1);
  return <section className="background-gain-panel"><div className="background-gain-heading"><div><span className="overline">OBJECTIVE OUTCOMES / LEARNING GAIN</span><h2>Learning gain by participant group</h2><p>Groups are created from Background answers. Scores use the number of scored Knowledge Test questions.</p></div><span className="gain-legend"><i className="pre-dot" /> Pre-test <i className="post-dot" /> Post-test</span></div>{groups.length ? <div className="gain-group-grid">{groups.map((group) => <article className="gain-group-card" key={`${group.question}-${group.answer}`}><div className="gain-group-title"><span>{group.answer}</span><small>{group.participants} participant{group.participants === 1 ? "" : "s"}</small></div><div className="gain-bars"><div className="gain-bar-row"><span>PRE</span><div><i style={{ width: `${Math.min(100, (group.pre / denominator) * 100)}%` }} /></div><strong>{group.pre.toFixed(2)}</strong></div><div className="gain-bar-row"><span>POST</span><div><i className="post-bar" style={{ width: `${Math.min(100, (group.post / denominator) * 100)}%` }} /></div><strong>{group.post.toFixed(2)}</strong></div></div><div className="gain-group-footer"><strong>{group.gain >= 0 ? "+" : ""}{group.gain.toFixed(2)} points</strong><span>SD {group.preSd.toFixed(2)} / {group.postSd.toFixed(2)}</span></div></article>)}</div> : <div className="background-gain-empty">Load participant response JSONs to compare learning gain across Background groups.</div>}</section>;
}

function Dashboard({ study, responses, error, onRefresh, onImport }: { study: Study; responses: ParticipantResponseExport[]; error: string; onRefresh: () => void; onImport: () => void }) {
  const metrics = calculateConstructMetrics(responses);
  const learningGain = calculateLearningGain(responses);
  const renderMetric = (construct: string) => {
    const metric = metrics.find((item) => item.construct === construct);
    return <div className={`metric-card ${metric?.average == null ? "unmeasured" : ""}`} key={construct}><span className="metric-icon">{construct.slice(0, 2).toUpperCase()}</span><div className="metric-card-copy"><h3>{construct}</h3>{metric?.average == null ? <span className="unmeasured-label">Not measured</span> : <><strong className="metric-value">{metric.average.toFixed(2)}<small>/ 7</small></strong><div className="metric-bar"><span style={{ width: `${(metric.average / 7) * 100}%` }} /></div></>}</div></div>;
  };
  return <div className="dashboard-wrap"><div className="dashboard-heading"><div><span className="overline">QUESTIONNAIRE DASHBOARD</span><h1>{study.name}</h1><p>GLEE construct averages across database responses.</p></div><div className="library-actions"><button className="create-study-button" onClick={onRefresh}>Refresh database</button><button className="secondary-action" onClick={onImport}>Load response JSONs</button></div></div>{error && <div className="settings-alert">{error}</div>}<div className="dashboard-summary"><div><span className="dashboard-summary-label">Responses loaded</span><strong>{responses.length}</strong></div><div><span className="dashboard-summary-label">Scale</span><strong>1-7</strong></div><div><span className="dashboard-summary-label">Constructs measured</span><strong>{metrics.filter((metric) => metric.average !== null).length} / {metrics.length}</strong></div></div><div className="dashboard-board"><div className="dashboard-band game-band">GAME USER EXPERIENCE</div><div className="dashboard-band learning-band">LEARNING PROCESSES &amp; OUTCOMES</div><section className="dashboard-column design-column"><header><span>01</span><strong>DESIGN QUALITIES</strong></header>{dashboardGroups.design.map(renderMetric)}</section><section className="dashboard-column experiential-column"><header><span>02</span><strong>EXPERIENTIAL RESPONSES</strong></header>{dashboardGroups.experiential.map(renderMetric)}</section><section className="dashboard-column subjective-column"><header><span>03</span><strong>SUBJECTIVE PERCEPTIONS</strong></header>{dashboardGroups.subjective.map(renderMetric)}</section><section className="dashboard-column objective-column"><header><span>04</span><strong>OBJECTIVE OUTCOMES</strong></header><div className={`metric-card learning-gain-card ${learningGain ? "" : "unmeasured"}`}><span className="metric-icon">LG</span><div className="metric-card-copy"><h3>Learning Gain</h3>{learningGain ? <><strong className="metric-value">{learningGain.pre.toFixed(2)} <small>-&gt; {learningGain.post.toFixed(2)} / {learningGain.total}</small></strong><div className="metric-bar"><span style={{ width: `${Math.max(0, Math.min(100, (learningGain.post / learningGain.total) * 100))}%` }} /></div><span className="metric-meta">Gain {learningGain.gain >= 0 ? "+" : ""}{learningGain.gain.toFixed(2)} points</span></> : <span className="unmeasured-label">Not measured</span>}</div></div></section></div><BackgroundLearningGainPanel responses={responses} study={study} /></div>;
}

function StudySettings({ study, published, updateStudy, onTogglePublished, error }: { study: Study; published: boolean; updateStudy: (field: keyof Study, value: string | boolean) => void; onTogglePublished: () => void; error: string }) {
  return <div className="settings-wrap"><div className="settings-heading"><div><span className="overline">STUDY SETTINGS</span><h1>Shape the study</h1><p>Give participants the context they need, and keep the evaluation flow consistent.</p></div><span className="settings-badge">GLEE / MVP</span></div>{error && <div className="settings-alert">{error}</div>}<div className="settings-grid"><div className="settings-main"><section className="settings-card"><div className="settings-card-heading"><div><span className="settings-number">01</span><h2>Study overview</h2></div><span>Visible to participants</span></div><label className="field-label">Study name<input value={study.name} onChange={(event) => updateStudy("name", event.target.value)} placeholder="e.g. Phishing Quest" /></label><label className="field-label">Description<textarea value={study.description} onChange={(event) => updateStudy("description", event.target.value)} /></label><div className="field-grid"><label className="field-label">Game name<input value={study.gameName} onChange={(event) => updateStudy("gameName", event.target.value)} /></label><label className="field-label">Estimated duration<input value={study.duration} onChange={(event) => updateStudy("duration", event.target.value)} placeholder="e.g. 20 minutes" /></label></div></section><section className="settings-card"><div className="settings-card-heading"><div><span className="settings-number">02</span><h2>Participant welcome</h2></div><span>Shown before Background</span></div><label className="field-label">Introduction text<textarea value={study.welcomeText} onChange={(event) => updateStudy("welcomeText", event.target.value)} /></label><label className="field-label">Game instructions<textarea value={study.gameInstructions} onChange={(event) => updateStudy("gameInstructions", event.target.value)} /></label></section></div><div className="settings-side"><section className="settings-card"><div className="settings-card-heading"><div><span className="settings-number">03</span><h2>Participant access</h2></div></div><label className="setting-toggle"><span><strong>Published / active</strong><small>Allow this study to be available in the participant flow</small></span><button className={`toggle ${published ? "on" : ""}`} onClick={onTogglePublished} aria-label="Toggle published status"><span /></button></label><label className="setting-toggle"><span><strong>Anonymous participation</strong><small>Do not require names or email addresses</small></span><button className={`toggle ${study.anonymous ? "on" : ""}`} onClick={() => updateStudy("anonymous", !study.anonymous)} aria-label="Toggle anonymous participation"><span /></button></label><label className="setting-toggle"><span><strong>Require consent</strong><small>Ask for agreement before starting</small></span><button className={`toggle ${study.consentRequired ? "on" : ""}`} onClick={() => updateStudy("consentRequired", !study.consentRequired)} aria-label="Toggle consent requirement"><span /></button></label></section><section className="settings-card"><div className="settings-card-heading"><div><span className="settings-number">04</span><h2>Study flow</h2></div></div><div className="flow-setting"><span className="flow-icon">01</span><div><strong>Background</strong><small>Before the knowledge test</small></div><span className="flow-fixed">ON</span></div><div className="flow-setting"><span className="flow-icon">02</span><div><strong>Knowledge test</strong><small>Before and after game play</small></div><span className="flow-fixed">2x</span></div><div className="flow-setting"><span className="flow-icon">03</span><div><strong>Game UX</strong><small>After the game session</small></div><span className="flow-fixed">ON</span></div><div className="display-mode-setting"><span><strong>Participant display</strong><small>Choose whether answers stay focused or appear by section</small></span><select value={study.displayMode} onChange={(event) => updateStudy("displayMode", event.target.value as Study["displayMode"])}><option value="one-at-a-time">One question at a time</option><option value="section">Entire section</option></select></div><label className="setting-toggle flow-toggle"><span><strong>Randomize post-test</strong><small>Shuffle questions and answer options</small></span><button className={`toggle ${study.postTestRandomized ? "on" : ""}`} onClick={() => updateStudy("postTestRandomized", !study.postTestRandomized)} aria-label="Toggle post-test randomization"><span /></button></label></section></div></div></div>;
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
