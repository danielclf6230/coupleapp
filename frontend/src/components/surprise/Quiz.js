import React, { useState } from "react";
import { QUESTIONS } from "./gameConfig";
export default function Quiz({ onWin, busy }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [wrong, setWrong] = useState(false);
  const q = QUESTIONS[index];
  const correct = answer === q.correct;
  return (
    <div className="sg-quiz">
      <p className="sg-eyebrow">QUESTION {index + 1} / {QUESTIONS.length}</p>
      <div className="sg-large-icon">💭</div>
      <h2>{q.text}</h2>
      <div className="sg-answers">
        {q.answers.map((text, i) => (
          <button
            key={i}
            className={
              answer === i
                ? correct
                  ? "sg-correct"
                  : "sg-wrong"
                : "sg-secondary"
            }
            disabled={correct || busy}
            onClick={() => {
              setAnswer(i);
              setWrong(i !== q.correct);
            }}
          >
            <b>{"ABCD"[i]}</b>
            {text}
          </button>
        ))}
      </div>
      <p role="status" className={wrong ? "sg-shake" : ""}>
        {wrong
          ? "你肯定？？？？？ 👀 再諗吓～"
          : correct
            ? "答啱喇！果然最了解我 💗"
            : "揀一個答案啦 ♡"}
      </p>
      {correct && (
        <button
          disabled={busy}
          onClick={() => {
            if (index === QUESTIONS.length - 1) onWin();
            else {
              setIndex(index + 1);
              setAnswer(null);
              setWrong(false);
            }
          }}
        >
          {index === QUESTIONS.length - 1 ? "完成默契挑戰" : "下一題 →"}
        </button>
      )}
    </div>
  );
}
