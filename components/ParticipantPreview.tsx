"use client";

import { useState } from "react";
import { buildParticipantResponse } from "../lib/participant";
import { createPreviewItems, type SectionStep } from "../lib/preview";
import {
  sectionInfo,
  type ParticipantResponseExport,
  type Question,
  type SectionKey,
  type Study,
} from "../lib/study-model";

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

export default function ParticipantPreview({ questions, study, onBack, onComplete }: { questions: Record<SectionKey, Question[]>; study: Study; onBack: () => void; onComplete?: (response: ParticipantResponseExport) => void }) {
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
