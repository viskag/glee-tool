"use client";

import {
  constructOptions,
  getQuestionObjectives,
  type GameUxMode,
  sectionInfo,
  type Question,
  type SectionKey,
  type Study,
} from "../lib/study-model";
import { gameUxConstructs } from "../lib/game-ux-template";

export default function Builder({
  study,
  questions,
  activeSection,
  selectedId,
  selected,
  activeQuestions,
  learningObjectives,
  gameUxMode,
  selectedGameUxConstructs,
  onSectionChange,
  onQuestionSelect,
  onUpdateQuestion,
  onToggleQuestionObjective,
  onUpdateOption,
  onSetCorrectOption,
  onAddOption,
  onRemoveOption,
  onAddQuestion,
  onToggleGameUxConstruct,
  onEditStudy,
}: {
  study: Study;
  questions: Record<SectionKey, Question[]>;
  activeSection: SectionKey;
  selectedId: string;
  selected: Question | undefined;
  activeQuestions: Question[];
  learningObjectives: string[];
  gameUxMode: GameUxMode;
  selectedGameUxConstructs: string[];
  onSectionChange: (section: SectionKey) => void;
  onQuestionSelect: (id: string) => void;
  onUpdateQuestion: (field: keyof Question, value: string | boolean) => void;
  onToggleQuestionObjective: (objective: string) => void;
  onUpdateOption: (index: number, value: string) => void;
  onSetCorrectOption: (option: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onAddQuestion: () => void;
  onToggleGameUxConstruct: (construct: string) => void;
  onEditStudy: () => void;
}) {
  const isTemplateGameUx =
    activeSection === "GAME_UX" && gameUxMode === "construct-template";
  const selectedQuestionCount = gameUxConstructs
    .filter(({ construct }) => selectedGameUxConstructs.includes(construct))
    .reduce((count, item) => count + item.questions.length, 0);
  const selectedObjectives = selected ? getQuestionObjectives(selected) : [];
  const objectiveChoices = [
    ...new Set([...learningObjectives, ...selectedObjectives]),
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="overline">QUESTIONNAIRE BUILDER</div>
          <h1>Build your study</h1>
          <p>Structure the moments that turn gameplay into evidence.</p>
        </div>
        <div className="heading-meta">
          <span className="meta-icon">
            {study.name.slice(0, 1).toUpperCase() || "S"}
          </span>
          <div>
            <strong>{study.name || "Untitled study"}</strong>
            <span>{study.gameName || "Serious game evaluation"}</span>
          </div>
          <button className="edit-title" onClick={onEditStudy}>
            Edit
          </button>
        </div>
      </div>

      <div className="builder-layout">
        {/* Section column */}
        <div className="section-column">
          <div className="column-heading">
            <div>
              <span className="overline">STUDY FLOW</span>
              <h2>Sections</h2>
            </div>
            <button className="icon-button" aria-label="Add section">
              +
            </button>
          </div>
          <div className="section-list">
            {(Object.keys(sectionInfo) as SectionKey[]).map((section) => (
              <button
                key={section}
                className={`section-card ${
                  activeSection === section ? "selected" : ""
                }`}
                onClick={() => onSectionChange(section)}
              >
                <span className="section-number">
                  {sectionInfo[section].eyebrow}
                </span>
                <span className="section-copy">
                  <strong>{sectionInfo[section].label}</strong>
                  <small>{sectionInfo[section].detail}</small>
                </span>
                <span className="section-count">{questions[section].length}</span>
              </button>
            ))}
          </div>
          <div className="flow-note">
            <span className="spark">*</span>
            <div>
              <strong>One test, two moments</strong>
              <p>
                The knowledge test is authored once, then reused after play
                with randomized question and answer order.
              </p>
            </div>
          </div>
        </div>

        {/* Question column */}
        <div className="question-column">
          <div className="column-heading">
            <div>
              <span className="overline">
                {sectionInfo[activeSection].eyebrow} / {activeSection}
              </span>
              <h2>
                {isTemplateGameUx
                  ? "Choose constructs"
                  : `${sectionInfo[activeSection].label} questions`}
              </h2>
            </div>
            {!isTemplateGameUx && (
              <button className="add-question" onClick={onAddQuestion}>
                + Add question
              </button>
            )}
          </div>
          {isTemplateGameUx ? (
            <div className="game-ux-template">
              <p className="game-ux-template-intro">
                Select the constructs to include. Each selection adds its fixed
                set of required 1–7 agreement questions.
              </p>
              <div className="game-ux-construct-list">
                {gameUxConstructs.map(({ construct, source, questions }) => (
                  <label
                    className="game-ux-construct-option"
                    key={construct}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGameUxConstructs.includes(construct)}
                      onChange={() => onToggleGameUxConstruct(construct)}
                    />
                    <span className="game-ux-construct-copy">
                      <strong>{construct}</strong>
                      <small>{source}</small>
                    </span>
                    <span className="game-ux-question-count">
                      {questions.length} items
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="question-list">
              {activeQuestions.map((question, index) => (
                <button
                  key={question.id}
                  className={`question-row ${
                    selectedId === question.id ? "selected" : ""
                  }`}
                  onClick={() => onQuestionSelect(question.id)}
                >
                  <span className="drag">::</span>
                  <span className="question-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="question-summary">
                    <strong>{question.text}</strong>
                    <small>
                      {question.id} <i /> {question.source ? `${question.source} · ` : ""}
                      {question.type}
                      {getQuestionObjectives(question).length > 0 && (
                        <>
                          <i /> {getQuestionObjectives(question).length} learning objective
                          {getQuestionObjectives(question).length === 1 ? "" : "s"}
                        </>
                      )}
                    </small>
                  </span>
                  <span className="required-pill">
                    {question.required ? "Required" : "Optional"}
                  </span>
                  <span className="row-arrow">{"->"}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Inspector */}
        <div className="inspector">
          {isTemplateGameUx ? (
            <>
              <div className="inspector-head">
                <div>
                  <span className="overline">GAME UX SELECTION</span>
                  <h2>{selectedGameUxConstructs.length} constructs</h2>
                </div>
              </div>
              <p className="game-ux-selection-count">
                {selectedQuestionCount} fixed questions will be included.
              </p>
              <p className="game-ux-selection-note">
                The template items and Dutch 1–7 scale are generated
                automatically. Use Preview to review the participant version.
              </p>
            </>
          ) : (
            <>
              <div className="inspector-head">
                <div>
                  <span className="overline">QUESTION DETAILS</span>
                  <h2>{selected?.id ?? "New question"}</h2>
                </div>
                <button className="more-button">...</button>
              </div>
              {selected && (
            <>
              <label className="field-label">
                Question text
                <textarea
                  value={selected.text}
                  onChange={(event) => onUpdateQuestion("text", event.target.value)}
                />
              </label>
              <div className="field-grid">
                <label className="field-label">
                  Question ID
                  <input
                    value={selected.id}
                    onChange={(event) => onUpdateQuestion("id", event.target.value)}
                  />
                </label>
                <label className="field-label">
                  Question type
                  <select
                    value={selected.type}
                    onChange={(event) => onUpdateQuestion("type", event.target.value)}
                  >
                    <option>Multiple choice</option>
                    <option>Likert scale</option>
                    <option>Short answer</option>
                  </select>
                </label>
              </div>
              <label className="toggle-field">
                <span>
                  <strong>Required question</strong>
                  <small>Participants must answer this to continue</small>
                </span>
                <button
                  className={`toggle ${selected.required ? "on" : ""}`}
                  onClick={() => onUpdateQuestion("required", !selected.required)}
                  aria-label="Toggle required"
                >
                  <span />
                </button>
              </label>

              {selected.type !== "Short answer" && (
                <div className="metadata-block options-block">
                  <div className="metadata-title">
                    <span>Answer options</span>
                    <small>{selected.options.length} choices</small>
                  </div>
                  {selected.options.map((option, optionIndex) => (
                    <div
                      className={`option-editor ${
                        selected.correct === option ? "correct-option" : ""
                      }`}
                      key={`${selected.id}-option-${optionIndex}`}
                    >
                      <button
                        type="button"
                        className={`correct-toggle ${
                          selected.correct === option ? "on" : ""
                        }`}
                        onClick={() => onSetCorrectOption(option)}
                        aria-label={`${
                          selected.correct === option ? "Unset" : "Set"
                        } correct answer for option ${optionIndex + 1}`}
                      >
                        {selected.correct === option ? "OK" : ""}
                      </button>
                      <span>{String.fromCharCode(65 + optionIndex)}</span>
                      <input
                        value={option}
                        onChange={(event) =>
                          onUpdateOption(optionIndex, event.target.value)
                        }
                        aria-label={`Option ${optionIndex + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveOption(optionIndex)}
                        aria-label={`Remove option ${optionIndex + 1}`}
                      >
                        x
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-option"
                    onClick={onAddOption}
                  >
                    + Add answer option
                  </button>
                </div>
              )}

              <div className="metadata-block">
                <div className="metadata-title">
                  <span>Learning metadata</span>
                  <small>Used for future learning-gain analysis</small>
                </div>
                <fieldset className="learning-objective-picker">
                  <legend>Learning objectives</legend>
                  <small>Select all objectives addressed by this question.</small>
                  {objectiveChoices.length ? (
                    objectiveChoices.map((objective) => (
                      <label key={objective} className="learning-objective-choice">
                        <input
                          type="checkbox"
                          checked={selectedObjectives.includes(objective)}
                          onChange={() => onToggleQuestionObjective(objective)}
                        />
                        <span>
                          {objective}
                          {!learningObjectives.includes(objective) && (
                            <small>Existing assignment</small>
                          )}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="learning-objective-empty">
                      Add learning objectives in questionnaire settings first.
                    </p>
                  )}
                </fieldset>
                <div className="field-grid">
                  <label className="field-label">
                    Bloom level
                    <select
                      value={selected.bloom}
                      onChange={(event) =>
                        onUpdateQuestion("bloom", event.target.value)
                      }
                    >
                      <option value="">Not specified</option>
                      <option>Remembering</option>
                      <option>Understanding</option>
                      <option>Applying</option>
                      <option>Analysing</option>
                      <option>Evaluating</option>
                      <option>Creating</option>
                    </select>
                  </label>
                  <label className="field-label">
                    Correct answer
                    <select
                      value={selected.correct}
                      onChange={(event) =>
                        onUpdateQuestion("correct", event.target.value)
                      }
                    >
                      <option value="">No correct answer</option>
                      {selected.options.map((option) => (
                        <option key={`correct-${option}`} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field-label">
                  Label/Keyword/Category
                  <input
                    value={selected.label ?? ""}
                    onChange={(event) =>
                      onUpdateQuestion("label", event.target.value)
                    }
                    placeholder="e.g. Age, Gametime, .."
                  />
                </label>
              </div>

              <div className="metadata-block glee-block">
                <div className="metadata-title">
                  <span>GLEE construct</span>
                  <small>Optional experience measure</small>
                </div>
                <label className="field-label">
                  <select
                    value={selected.construct}
                    onChange={(event) =>
                      onUpdateQuestion("construct", event.target.value)
                    }
                  >
                    {constructOptions.map((option) => (
                      <option key={option} value={option}>
                        {option || "No construct linked"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}