"use client";

import { useState, type FormEvent } from "react";
import type { Study } from "../lib/study-model";

export default function StudySettings({
  study,
  learningObjectives,
  published,
  updateStudy,
  onAddLearningObjective,
  onRemoveLearningObjective,
  onTogglePublished,
  error,
}: {
  study: Study;
  learningObjectives: string[];
  published: boolean;
  updateStudy: (field: keyof Study, value: string | boolean) => void;
  onAddLearningObjective: (objective: string) => void;
  onRemoveLearningObjective: (objective: string) => void;
  onTogglePublished: () => void;
  error: string;
}) {
  const [objectiveDraft, setObjectiveDraft] = useState("");

  function addObjective(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const objective = objectiveDraft.trim();
    if (!objective) return;
    onAddLearningObjective(objective);
    setObjectiveDraft("");
  }

  return (
    <div className="settings-wrap">
      <div className="settings-heading">
        <div>
          <span className="overline">STUDY SETTINGS</span>
          <h1>Shape the study</h1>
          <p>Give participants the context they need, and keep the evaluation flow consistent.</p>
        </div>
        <span className="settings-badge">GLEE / MVP</span>
      </div>
      {error && <div className="settings-alert">{error}</div>}
      <div className="settings-grid">
        <div className="settings-main">
          <section className="settings-card">
            <div className="settings-card-heading">
              <div><span className="settings-number">01</span><h2>Study overview</h2></div>
              <span>Visible to participants</span>
            </div>
            <label className="field-label">Study name<input value={study.name} onChange={(event) => updateStudy("name", event.target.value)} placeholder="e.g. Phishing Quest" /></label>
            <label className="field-label">Description<textarea value={study.description} onChange={(event) => updateStudy("description", event.target.value)} /></label>
            <div className="field-grid">
              <label className="field-label">Game name<input value={study.gameName} onChange={(event) => updateStudy("gameName", event.target.value)} /></label>
              <label className="field-label">Estimated duration<input value={study.duration} onChange={(event) => updateStudy("duration", event.target.value)} placeholder="e.g. 20 minutes" /></label>
            </div>
          </section>
          <section className="settings-card">
            <div className="settings-card-heading">
              <div><span className="settings-number">02</span><h2>Participant welcome</h2></div>
              <span>Shown before Background</span>
            </div>
            <label className="field-label">Introduction text<textarea value={study.welcomeText} onChange={(event) => updateStudy("welcomeText", event.target.value)} /></label>
            <label className="field-label">Game instructions<textarea value={study.gameInstructions} onChange={(event) => updateStudy("gameInstructions", event.target.value)} /></label>
          </section>
          <section className="settings-card">
            <div className="settings-card-heading">
              <div><span className="settings-number">03</span><h2>Learning objectives</h2></div>
              <span>Available for question assignment</span>
            </div>
            <p className="learning-objective-help">
              Add this questionnaire’s learning objectives, then assign them to questions from the Editor. Removing an objective here does not erase it from questions already using it.
            </p>
            <form className="learning-objective-form" onSubmit={addObjective}>
              <label className="field-label" htmlFor="learning-objective-input">
                New learning objective
                <input
                  id="learning-objective-input"
                  value={objectiveDraft}
                  onChange={(event) => setObjectiveDraft(event.target.value)}
                  placeholder="e.g. Identify common phishing techniques"
                />
              </label>
              <button className="add-question" type="submit" disabled={!objectiveDraft.trim()}>
                + Add objective
              </button>
            </form>
            {learningObjectives.length ? (
              <ul className="learning-objective-list">
                {learningObjectives.map((objective) => (
                  <li key={objective}>
                    <span>{objective}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveLearningObjective(objective)}
                      aria-label={`Remove learning objective ${objective}`}
                      title="Remove from this questionnaire’s objective list"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="learning-objective-empty">No learning objectives added yet.</p>
            )}
          </section>
        </div>
        <div className="settings-side">
          <section className="settings-card">
            <div className="settings-card-heading">
              <div><span className="settings-number">04</span><h2>Participant access</h2></div>
            </div>
            <label className="setting-toggle">
              <span><strong>Published / active</strong><small>Allow this study to be available in the participant flow</small></span>
              <button className={`toggle ${published ? "on" : ""}`} onClick={onTogglePublished} aria-label="Toggle published status"><span /></button>
            </label>
            <label className="setting-toggle">
              <span><strong>Anonymous participation</strong><small>Do not require names or email addresses</small></span>
              <button className={`toggle ${study.anonymous ? "on" : ""}`} onClick={() => updateStudy("anonymous", !study.anonymous)} aria-label="Toggle anonymous participation"><span /></button>
            </label>
            <label className="setting-toggle">
              <span><strong>Require consent</strong><small>Ask for agreement before starting</small></span>
              <button className={`toggle ${study.consentRequired ? "on" : ""}`} onClick={() => updateStudy("consentRequired", !study.consentRequired)} aria-label="Toggle consent requirement"><span /></button>
            </label>
          </section>
          <section className="settings-card">
            <div className="settings-card-heading">
              <div><span className="settings-number">05</span><h2>Study flow</h2></div>
            </div>
            <div className="flow-setting"><span className="flow-icon">01</span><div><strong>Background</strong><small>Before the knowledge test</small></div><span className="flow-fixed">ON</span></div>
            <div className="flow-setting"><span className="flow-icon">02</span><div><strong>Knowledge test</strong><small>Before and after game play</small></div><span className="flow-fixed">2x</span></div>
            <div className="flow-setting"><span className="flow-icon">03</span><div><strong>Game UX</strong><small>After the game session</small></div><span className="flow-fixed">ON</span></div>
            <div className="display-mode-setting">
              <span><strong>Participant display</strong><small>Choose whether answers stay focused or appear by section</small></span>
              <select value={study.displayMode} onChange={(event) => updateStudy("displayMode", event.target.value as Study["displayMode"])}>
                <option value="one-at-a-time">One question at a time</option>
                <option value="section">Entire section</option>
              </select>
            </div>
            <label className="setting-toggle flow-toggle">
              <span><strong>Randomize post-test</strong><small>Shuffle questions and answer options</small></span>
              <button className={`toggle ${study.postTestRandomized ? "on" : ""}`} onClick={() => updateStudy("postTestRandomized", !study.postTestRandomized)} aria-label="Toggle post-test randomization"><span /></button>
            </label>
          </section>
        </div>
      </div>
    </div>
  );
}