import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import Quiz from "./Quiz";
import { QUESTIONS } from "./gameConfig";

test("all six questions must be answered, including shoe size and favourite body part", () => {
  const onWin = jest.fn();
  const { container } = render(<Quiz onWin={onWin} busy={false} />);
  expect(QUESTIONS).toHaveLength(6);
  expect(QUESTIONS[4].answers[QUESTIONS[4].correct]).toBe("US 9.5");
  expect(QUESTIONS[5].answers[QUESTIONS[5].correct]).toBe("對腳");
  QUESTIONS.forEach((question, index) => {
    expect(screen.getByText(`QUESTION ${index + 1} / 6`)).toBeTruthy();
    expect(screen.getByText(question.text)).toBeTruthy();
    expect(onWin).not.toHaveBeenCalled();
    if (index === 4) {
      fireEvent.click(container.querySelectorAll(".sg-answers button")[0]);
      expect(screen.queryByRole("button", { name: "下一題 →" })).toBeNull();
    }
    fireEvent.click(container.querySelectorAll(".sg-answers button")[question.correct]);
    fireEvent.click(screen.getByRole("button", { name: index === 5 ? "完成默契挑戰" : "下一題 →" }));
  });
  expect(onWin).toHaveBeenCalledTimes(1);
});
