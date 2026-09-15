"use client";

import {
  calculateBackgroundLearningGain,
  calculateConstructMetrics,
  calculateLearningGain,
} from "../lib/analytics";
import {
  dashboardGroups,
  type ParticipantResponseExport,
  type Study,
} from "../lib/study-model";
import { getConstructIcon } from "../lib/construct-icons";

function BackgroundLearningGainPanel({
  responses,
  study,
}: {
  responses: ParticipantResponseExport[];
  study: Study;
}) {
  const questionGroups = calculateBackgroundLearningGain(responses);

  return (
    <section className="background-gain-panel">
      <div className="background-gain-heading">
        <div>
          <span className="overline">
            OBJECTIVE OUTCOMES / LEARNING GAIN
          </span>
          <h2>Learning gain by participant group</h2>
          <p>
            Groups are created from Background answers. Scores use the number
            of scored Knowledge Test questions.
          </p>
        </div>
        <span className="gain-legend">
          <i className="pre-dot" /> Pre-test
          <i className="post-dot" /> Post-test
        </span>
      </div>

      {questionGroups.length ? (
        <div className="gain-question-groups">
          {questionGroups.map((group) => {
            const totalParticipants = group.answers.reduce(
              (sum, a) => sum + a.participants,
              0
            );
            const denominator = Math.max(1, group.scoredQuestionCount);

            return (
              <div className="gain-question-group" key={group.questionId}>
                <div className="gain-question-heading">
                  <div>
                    <span className="overline">
                      BACKGROUND / {group.questionId}
                    </span>
                    <h3>{group.questionText}</h3>
                  </div>
                  <span className="gain-question-meta">
                    {totalParticipants} participant
                    {totalParticipants === 1 ? "" : "s"} · based on{" "}
                    {group.scoredQuestionCount} scored test question
                    {group.scoredQuestionCount === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="gain-group-grid">
                  {group.answers.map((a) => (
                    <article
                      className="gain-group-card"
                      key={`${group.questionId}-${a.answer}`}
                    >
                      <div className="gain-group-title">
                        <span>{a.answer}</span>
                        <small>
                          {a.participants} participant
                          {a.participants === 1 ? "" : "s"}
                        </small>
                      </div>
                      <div className="gain-bars">
                        <div className="gain-bar-row">
                          <span>PRE</span>
                          <div>
                            <i
                              style={{
                                width: `${Math.min(
                                  100,
                                  (a.pre / denominator) * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <strong>{a.pre.toFixed(2)}</strong>
                        </div>
                        <div className="gain-bar-row">
                          <span>POST</span>
                          <div>
                            <i
                              className="post-bar"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (a.post / denominator) * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <strong>{a.post.toFixed(2)}</strong>
                        </div>
                      </div>
                      <div className="gain-group-footer">
                        <strong>
                          {a.gain >= 0 ? "+" : ""}
                          {a.gain.toFixed(2)} points
                        </strong>
                        <span>
                          SD {a.preSd.toFixed(2)} / {a.postSd.toFixed(2)}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="background-gain-empty">
          Load participant response JSONs to compare learning gain across
          Background groups.
        </div>
      )}
    </section>
  );
}

export default function Dashboard({
  study,
  responses,
  error,
  onRefresh,
  onImport,
}: {
  study: Study;
  responses: ParticipantResponseExport[];
  error: string;
  onRefresh: () => void;
  onImport: () => void;
}) {
  const metrics = calculateConstructMetrics(responses);
  const learningGain = calculateLearningGain(responses);

  const renderMetric = (construct: string) => {
    const metric = metrics.find((item) => item.construct === construct);
    const iconSrc = getConstructIcon(construct);
  return (
    <div
      className={`metric-card ${metric?.average == null ? "unmeasured" : ""}`}
      key={construct}
    >
      <span className="metric-icon">
        {iconSrc ? (
          <img src={iconSrc} alt="" aria-hidden="true" />
        ) : (
          construct.slice(0, 2).toUpperCase()
        )}
      </span>
        <div className="metric-card-copy">
          <h3>{construct}</h3>
          {metric?.average == null ? (
            <span className="unmeasured-label">Not measured</span>
          ) : (
            <>
              <strong className="metric-value">
                {metric.average.toFixed(2)}
                <small>/ 7</small>
              </strong>
              <div className="metric-bar">
                <span style={{ width: `${(metric.average / 7) * 100}%` }} />
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-wrap">
      <div className="dashboard-heading">
        <div>
          <span className="overline">QUESTIONNAIRE DASHBOARD</span>
          <h1>{study.name}</h1>
          <p>GLEE construct averages across database responses.</p>
        </div>
        <div className="library-actions">
          <button className="create-study-button" onClick={onRefresh}>
            Refresh database
          </button>
          <button className="secondary-action" onClick={onImport}>
            Load response JSONs
          </button>
        </div>
      </div>

      {error && <div className="settings-alert">{error}</div>}

      <div className="dashboard-summary">
        <div>
          <span className="dashboard-summary-label">Responses loaded</span>
          <strong>{responses.length}</strong>
        </div>
        <div>
          <span className="dashboard-summary-label">Scale</span>
          <strong>1-7</strong>
        </div>
        <div>
          <span className="dashboard-summary-label">Constructs measured</span>
          <strong>
            {metrics.filter((metric) => metric.average !== null).length} /{" "}
            {metrics.length}
          </strong>
        </div>
      </div>

      <div className="dashboard-board">
        <div className="dashboard-band game-band">GAME USER EXPERIENCE</div>
        <div className="dashboard-band learning-band">
          LEARNING PROCESSES &amp; OUTCOMES
        </div>

        <section className="dashboard-column design-column">
          <header>
            <span>01</span>
            <strong>DESIGN QUALITIES</strong>
          </header>
          {dashboardGroups.design.map(renderMetric)}
        </section>

        <section className="dashboard-column experiential-column">
          <header>
            <span>02</span>
            <strong>EXPERIENTIAL RESPONSES</strong>
          </header>
          {dashboardGroups.experiential.map(renderMetric)}
        </section>

        <section className="dashboard-column subjective-column">
          <header>
            <span>03</span>
            <strong>SUBJECTIVE PERCEPTIONS</strong>
          </header>
          {dashboardGroups.subjective.map(renderMetric)}
        </section>

        <section className="dashboard-column objective-column">
          <header>
            <span>04</span>
            <strong>OBJECTIVE OUTCOMES</strong>
          </header>
          <div
            className={`metric-card learning-gain-card ${
              learningGain ? "" : "unmeasured"
            }`}
          >
            <span className="metric-icon">
  {(() => {
    const src = getConstructIcon("Learning Gain");
    return src ? <img src={src} alt="" aria-hidden="true" /> : "LG";
  })()}
</span>
            <div className="metric-card-copy">
              <h3>Learning Gain</h3>
              {learningGain ? (
                <>
                  <strong className="metric-value">
                    {learningGain.pre.toFixed(2)}{" "}
                    <small>
                      -&gt; {learningGain.post.toFixed(2)} /{" "}
                      {learningGain.total}
                    </small>
                  </strong>
                  <div className="metric-bar">
                    <span
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            (learningGain.post / learningGain.total) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="metric-meta">
                    Gain {learningGain.gain >= 0 ? "+" : ""}
                    {learningGain.gain.toFixed(2)} points
                  </span>
                </>
              ) : (
                <span className="unmeasured-label">Not measured</span>
              )}
            </div>
          </div>
        </section>
      </div>

      <BackgroundLearningGainPanel responses={responses} study={study} />
    </div>
  );
}
