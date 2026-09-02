import type { StudySummary } from "../lib/study-model";

type QuestionnaireLibraryProps = {
  questionnaires: StudySummary[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onExport: () => void;
  onImport: () => void;
  onDashboard: (id: string) => void;
  error: string;
};

export default function QuestionnaireLibrary({ questionnaires, onOpen, onCreate, onExport, onImport, onDashboard, error }: QuestionnaireLibraryProps) {
  return <div className="library-wrap"><div className="library-heading"><div><span className="overline">GLEE WORKSPACE</span><h1>Your questionnaires</h1><p>One evaluation questionnaire for each educational game.</p></div><div className="library-actions"><button className="secondary-action" onClick={onImport}>Load JSON</button><button className="secondary-action" onClick={onExport}>Save current JSON</button><button className="create-study-button" onClick={onCreate}>+ New questionnaire</button></div></div>{error && <div className="settings-alert">{error}</div>}<div className="library-toolbar"><span>{questionnaires.length} questionnaires</span><span className="library-hint">Select a questionnaire to edit its Background, Knowledge test, and Game UX flow.</span></div><div className="study-grid">{questionnaires.map((questionnaire) => <div className="study-card" key={questionnaire.id}><button className="study-card-open" onClick={() => onOpen(questionnaire.id)}><div className="study-card-top"><span className="study-card-mark">{questionnaire.name.slice(0, 1).toUpperCase() || "Q"}</span><span className={`study-status ${questionnaire.status.toLowerCase()}`}>{questionnaire.status}</span></div><div className="study-card-copy"><h2>{questionnaire.name}</h2><p>{questionnaire.description || "No game description yet"}</p></div><div className="study-card-meta"><span>{questionnaire.questions} questions</span><span>Updated {questionnaire.updated}</span><span className="card-arrow">{"->"}</span></div></button><button className="study-card-dashboard" onClick={() => onDashboard(questionnaire.id)}>Open dashboard</button></div>)}<button className="new-study-card" onClick={onCreate}><span>+</span><strong>Evaluate another game</strong><small>Create a separate questionnaire</small></button></div></div>;
}
