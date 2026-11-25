import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/StyledSelect.css";

export default function StyledSelect({ children, value, onChange, className = "", disabled, ...props }) {
  const id = useId();
  const trigger = useRef(null);
  const menu = useRef(null);
  const search = useRef({ text: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({});
  const options = React.Children.toArray(children).filter(React.isValidElement).map(({ props: option }) => ({
    ...option, value: String(option.value ?? option.children),
  }));
  const selected = options.findIndex((option) => option.value === String(value));
  const enabled = options.map((option, index) => !option.disabled ? index : -1).filter((index) => index >= 0);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const upward = below < 180 && above > below;
      const width = Math.min(Math.max(rect.width, 180), window.innerWidth - 24);
      setPosition({
        width,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        maxHeight: Math.max(60, Math.min(300, upward ? above : below)),
        ...(upward ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
      });
    };
    const outside = (event) => {
      if (!trigger.current?.contains(event.target) && !menu.current?.contains(event.target)) setOpen(false);
    };
    place();
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, open, id]);

  const show = () => {
    setActive(selected >= 0 && !options[selected].disabled ? selected : enabled[0]);
    setOpen(true);
  };
  const choose = (index) => {
    if (options[index]?.disabled || !options[index]) return;
    onChange?.({ target: { value: options[index].value } });
    setOpen(false);
    trigger.current.focus();
  };
  const keyDown = (event) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "Tab") setOpen(false);
    else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!open) show();
      else {
        const current = enabled.indexOf(active);
        const next = event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1 :
          (current + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length;
        setActive(enabled[next]);
      }
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(active);
      else show();
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      const text = (now - search.current.time < 700 ? search.current.text : "") + event.key.toLowerCase();
      search.current = { text, time: now };
      const match = enabled.find((index) => String(options[index].children).toLowerCase().startsWith(text));
      if (!open) show();
      if (match !== undefined) setActive(match);
    }
  };

  return <>
    <button
      {...props}
      ref={trigger}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? `${id}-list` : undefined}
      aria-activedescendant={open ? `${id}-${active}` : undefined}
      disabled={disabled}
      className={`styled-select ${className}`}
      onClick={() => open ? setOpen(false) : show()}
      onKeyDown={keyDown}
      onBlur={(event) => { if (!menu.current?.contains(event.relatedTarget)) setOpen(false); }}
    >
      <span className="styled-select-value">{options[selected >= 0 ? selected : 0]?.children}</span>
      <svg className="styled-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {open && createPortal(
      <div ref={menu} id={`${id}-list`} role="listbox" aria-label={props["aria-label"] || "Options"} className="styled-select-menu" style={position}>
        {options.map((option, index) => (
          <button
            key={`${option.value}-${index}`}
            id={`${id}-${index}`}
            type="button"
            role="option"
            aria-selected={index === selected}
            disabled={option.disabled}
            tabIndex={-1}
            className={`styled-select-option ${active === index ? "is-active" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onPointerMove={() => !option.disabled && setActive(index)}
            onClick={() => choose(index)}
          >
            <span>{option.children}</span><span aria-hidden="true">{index === selected ? "✓" : ""}</span>
          </button>
        ))}
      </div>, document.body,
    )}
  </>;
}
