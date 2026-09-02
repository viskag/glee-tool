import type { StudySummary } from "../lib/study-model";

type PlayerLibraryProps = {
  questionnaires: StudySummary[];
  onStart: (id: string) => void;
};

export default function PlayerLibrary({ questionnaires, onStart }: PlayerLibraryProps) {
  return <div className="player-library-wrap"><div className="player-library-heading"><span className="overline">PARTICIPANT SPACE</span><h1>Choose a questionnaire</h1><p>Select the educational game evaluation you have been invited to complete.</p></div><div className="player-questionnaire-grid">{questionnaires.map((questionnaire) => <button className="player-questionnaire-card" key={questionnaire.id} onClick={() => onStart(questionnaire.id)}><span className="player-card-mark">{questionnaire.name.slice(0, 1).toUpperCase() || "Q"}</span><div><h2>{questionnaire.name}</h2><p>{questionnaire.description || "Serious game evaluation"}</p><small>{questionnaire.questions} questions · {questionnaire.status === "Published" ? "Available now" : "Preview study"}</small></div><span className="player-card-arrow">{"->"}</span></button>)}</div></div>;
}
