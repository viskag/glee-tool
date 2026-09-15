"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import QuestionnaireLibrary from "../components/QuestionnaireLibrary";
import PlayerLibrary from "../components/PlayerLibrary";
import {
  initialQuestions,
  initialStudy,
  initialStudySummaries,
  normalizeQuestionnaireConstruct,
  type ParticipantResponseExport,
  type QuestionnaireExport,
  type QuestionnaireRecord,
  type Question,
  type SectionKey,
  type Study,
  type StudySummary,
} from "../lib/study-model";
import ParticipantPreview from "../components/ParticipantPreview";
import Dashboard from "../components/Dashboard";
import StudySettings from "../components/StudySettings";
import Builder from "../components/Builder";

export default function Home() {
  const { data: session } = useSession();
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
    const newQuestion: Question = { id: `${prefix}_${String(nextNumber).padStart(2, "0")}`, text: "Untitled question", type: "Multiple choice", required: false, objective: "", bloom: "", correct: "", label: "", construct: activeSection === "TEST" ? "Learning Gain" : "", options: ["Option 1", "Option 2"] };
    setQuestions((current) => ({ ...current, [activeSection]: [...current[activeSection], newQuestion] }));
    setSelectedId(newQuestion.id);
  }

  function selectSection(section: SectionKey) {
    setActiveSection(section);
    setSelectedId(questions[section][0]?.id ?? "");
  }

  function updateStudy(field: keyof Study, value: string | boolean) {
    setStudy((current) => ({ ...current, [field]: value }));
    setPublishError("");
  }

  function createQuestionnaire() {
    const newStudy: Study = { ...initialStudy, id: `questionnaire-${Date.now()}`, name: "Untitled questionnaire", description: "", gameName: "", gameInstructions: "", duration: "", welcomeText: "" };
    const defaultQuestions: Record<SectionKey, Question[]> = {
      BACKGROUND: [
        { id: `BG_${Date.now()}_01`, text: "How often do you play digital games?", type: "Multiple choice", required: true, objective: "", bloom: "", correct: "", label: "", construct: "", options: ["Daily", "A few times a week", "A few times a month", "Rarely"] },
      ],
      TEST: [
        { id: `TEST_${Date.now()}_01`, text: "Which action should you take when you encounter a suspicious email?", type: "Multiple choice", required: true, objective: "Identify phishing attempts", bloom: "Applying", correct: "Report it and avoid opening links", label: "", construct: "Learning Gain", options: ["Reply to ask who sent it", "Report it and avoid opening links", "Forward it to a friend", "Download the attachment"] },
      ],
      GAME_UX: [
        { id: `UX_${Date.now()}_01`, text: "I was fully absorbed in the game.", type: "Likert scale", required: true, objective: "", bloom: "", correct: "", label: "", construct: "Immersion", options: ["1 - Completely disagree", "2 - Disagree", "3 - Slightly disagree", "4 - Neutral / neither agree nor disagree", "5 - Slightly agree", "6 - Agree", "7 - Completely agree"] },
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
<div className="user-chip">
  <span className="avatar">
    {(session?.user?.name ?? "R").slice(0, 2).toUpperCase()}
  </span>
  <span>
    <strong>{session?.user?.name ?? "Researcher"}</strong>
    <small>{session?.user?.role ?? ""}</small>
  </span>
  <button
    className="logout-button"
    onClick={() => signOut({ callbackUrl: "/login" })}
    title="Sign out"
  >
    Logout
  </button>
</div>
      </aside>

      <section className="workspace">
        {creationSuccess && <div className="creation-success" role="status">{creationSuccess}</div>}
        <header className="topbar"><div><span className="breadcrumb">{view === "library" || view === "player" ? "Workspace /" : `Questionnaires / ${study.name || "Untitled questionnaire"} /`}</span> <strong>{view === "library" ? "All questionnaires" : view === "player" ? "Participant questionnaires" : view === "dashboard" ? "Dashboard" : view === "builder" ? "Editor" : view === "settings" ? "Questionnaire settings" : view === "player-preview" ? "Participant session" : "Participant preview"}</strong></div><div className="top-actions"><span className={`save-state ${published ? "published" : ""}`}><span className="status-dot" />{published ? "Published" : "All changes saved"}</span>{view === "builder" && <button className="preview-button" onClick={() => setView("preview")}>Preview questionnaire<span>{"->"}</span></button>}{view === "preview" && <button className="preview-button" onClick={() => setView("builder")}>Back to editor<span>{"->"}</span></button>}{view === "settings" && <button className="preview-button" onClick={() => setView("builder")}>Back to editor<span>{"->"}</span></button>}{view === "dashboard" && <button className="preview-button" onClick={() => setView("library")}>Back to questionnaires<span>{"->"}</span></button>}{view !== "library" && view !== "player" && view !== "player-preview" && view !== "dashboard" && <button className="publish-button" onClick={publishStudy}>Save questionnaire<span>^</span></button>}</div></header>

        {view === "library" ? <QuestionnaireLibrary questionnaires={studySummaries} onOpen={openQuestionnaire} onCreate={createQuestionnaire} onExport={exportQuestionnaire} onImport={() => importInputRef.current?.click()} onDashboard={openDashboard} error={publishError} /> : view === "dashboard" ? <Dashboard study={questionnaireStore[dashboardStudyId]?.study ?? (dashboardStudyId === initialStudy.id ? initialStudy : study)} responses={dashboardResponses} error={dashboardError} onRefresh={() => openDashboard(dashboardStudyId)} onImport={() => responseImportInputRef.current?.click()} /> : view === "player" ? <PlayerLibrary questionnaires={studySummaries} onStart={startPlayer} /> : view === "player-preview" && playerStudy && playerQuestions ? <ParticipantPreview questions={playerQuestions} study={playerStudy} onBack={() => setView("player")} onComplete={saveParticipantResponse} /> : view === "preview" ? <ParticipantPreview questions={questions} study={study} onBack={() => setView("builder")} /> : view === "settings" ? <StudySettings study={study} published={published} updateStudy={updateStudy} onTogglePublished={() => setPublished((current) => !current)} error={publishError} /> : (
  <Builder
    study={study}
    questions={questions}
    activeSection={activeSection}
    selectedId={selectedId}
    selected={selected}
    activeQuestions={activeQuestions}
    onSectionChange={selectSection}
    onQuestionSelect={setSelectedId}
    onUpdateQuestion={updateQuestion}
    onUpdateOption={updateOption}
    onSetCorrectOption={setCorrectOption}
    onAddOption={addOption}
    onRemoveOption={removeOption}
    onAddQuestion={addQuestion}
    onEditStudy={() => setView("settings")}
  />
)}
      </section>
      <input ref={importInputRef} className="file-input" type="file" accept="application/json,.json" onChange={importQuestionnaire} />
      <input ref={responseImportInputRef} className="file-input" type="file" multiple accept="application/json,.json" onChange={importResponses} />
    </main>
  );
}
