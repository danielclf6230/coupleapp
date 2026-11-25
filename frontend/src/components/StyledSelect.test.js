import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import StyledSelect from "./StyledSelect";

function Picker() {
  const [value, setValue] = useState("1");
  return <StyledSelect aria-label="Album" value={value} onChange={(event) => setValue(event.target.value)}>
    <option value="" disabled>Choose an album</option>
    <option value={1}>August</option>
    <option value={2}>February</option>
    <option value={3}>Movie Time</option>
  </StyledSelect>;
}

test("styled menu selects an option, preserves numeric values and closes", () => {
  render(<Picker />);
  const picker = screen.getByRole("combobox", { name: "Album" });
  expect(picker.textContent).toBe("August");
  fireEvent.click(picker);
  expect(screen.getByRole("option", { name: "August" }).getAttribute("aria-selected")).toBe("true");
  fireEvent.click(screen.getByRole("option", { name: "Movie Time" }));
  expect(picker.textContent).toBe("Movie Time");
  expect(screen.queryByRole("listbox")).toBeNull();
});

test("keyboard navigation skips disabled options and supports typeahead and Escape", () => {
  render(<Picker />);
  const picker = screen.getByRole("combobox");
  fireEvent.keyDown(picker, { key: "ArrowDown" });
  fireEvent.keyDown(picker, { key: "Home" });
  fireEvent.keyDown(picker, { key: "ArrowDown" });
  fireEvent.keyDown(picker, { key: "Enter" });
  expect(picker.textContent).toBe("February");
  fireEvent.keyDown(picker, { key: "m" });
  fireEvent.keyDown(picker, { key: "Enter" });
  expect(picker.textContent).toBe("Movie Time");
  fireEvent.click(picker);
  fireEvent.keyDown(picker, { key: "Escape" });
  expect(screen.queryByRole("listbox")).toBeNull();
  fireEvent.click(picker);
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("listbox")).toBeNull();
});
