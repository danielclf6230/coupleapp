import React, { useState, useEffect } from "react";
import axios from "axios";
import ConfirmDialog from "../components/ConfirmDialog";
import "../styles/CountDown.css";
import "../styles/PageHeader.css";

const baseURL = process.env.REACT_APP_API_URL;

const candyColors = [
  "#FFB3BA", // pastel pink
  "#FFDFBA", // peach
  "#FFFFBA", // soft yellow
  "#BAFFC9", // mint
  "#BAE1FF", // baby blue
  "#E0BBE4", // lavender
  "#FFCCE5", // light rose
  "#C9F3FF", // icy blue
];

const emojiOptions = [
  "🎉",
  "🎂",
  "🎁",
  "🚀",
  "🌟",
  "💖",
  "🕒",
  "🎈",
  "🍰",
  "💫",
];

const Countdowns = () => {
  const [countdowns, setCountdowns] = useState([]);
  const [editing, setEditing] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const loadCountdowns = async () => {
    const res = await axios.get(`${baseURL}/api/countdowns`);
    setCountdowns(res.data);
  };

  useEffect(() => {
    loadCountdowns();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async () => {
    const payload = {
      id: editing.id,
      cd_title: editing.cd_title,
      cd_emoji: editing.cd_emoji,
      cd_target_date: editing.cd_target_date,
    };
    await axios.post(`${baseURL}/api/countdowns/upload`, payload);
    setEditing(null);
    loadCountdowns();
  };

  const handleDelete = (id) => {
    setDeleteTargetId(id);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId === null) return;

    await axios.delete(`${baseURL}/api/countdowns/${deleteTargetId}`);

    if (editing?.id === deleteTargetId) {
      setEditing(null);
    }

    setDeleteTargetId(null);
    loadCountdowns();
  };

  const calculateTimeLeft = (targetDate) => {
    if (!targetDate) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

    let endOfDay;

    try {
      // If input is date-only (e.g. "2025-07-28"), append time
      if (/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        endOfDay = new Date(`${targetDate}T23:59:59`);
      } else {
        // Already a datetime or ISO string
        const parsed = new Date(targetDate);
        if (isNaN(parsed)) throw new Error("Invalid date format");
        // Normalize to end of day
        parsed.setHours(23, 59, 59, 999);
        endOfDay = parsed;
      }
    } catch (err) {
      console.error("Failed to parse targetDate:", targetDate);
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const total = endOfDay - now;

    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));

    return { days, hours, minutes, seconds };
  };

  return (
    <div className="countdown-root">
      <div className="countdown-wrapper">
        <div className="countdown-header page-header">
          <div className="page-header-main">
            <h3 className="page-title-row">
              <span className="page-title-icon" aria-hidden="true">
                📆
              </span>
              <span className="page-title">My Countdowns</span>
            </h3>
            <p className="page-subtitle">Track upcoming moments</p>
          </div>
          <div className="countdown-controls page-controls">
            <button
              className="countdown-upload-btn page-primary-btn"
              onClick={() =>
                setEditing({
                  cd_title: "",
                  cd_emoji: "🎉",
                  cd_target_date: "",
                })
              }
            >
              <span className="countdown-button-icon" aria-hidden="true">
                ✦
              </span>
              <span>New Countdown</span>
            </button>
          </div>
        </div>

        <div className="countdown-frame">
          <div className="countdown-scroll">
            <div className="countdown-grid">
              {countdowns.map((cd, index) => {
                const { days, hours, minutes, seconds } = calculateTimeLeft(
                  cd.cd_target_date
                );
                const color = candyColors[index % candyColors.length];

                return (
                  <div
                    key={cd.id}
                    className="countdown-banner"
                    style={{ backgroundColor: color }}
                    onClick={() =>
                      setEditing({
                        ...cd,
                        cd_target_date: new Date(cd.cd_target_date)
                          .toISOString()
                          .split("T")[0],
                      })
                    }
                  >
                    <div className="banner-left">
                      <div className="banner-title">
                        {cd.cd_title} <span>{cd.cd_emoji}</span>
                      </div>
                    </div>

                    <div className="banner-countdown">
                      <div>
                        {String(days).padStart(2, "0")}
                        <span>Days</span>
                      </div>
                      <div>
                        {String(hours).padStart(2, "0")}
                        <span>Hours</span>
                      </div>
                      <div>
                        {String(minutes).padStart(2, "0")}
                        <span>Minutes</span>
                      </div>
                      <div>
                        {String(seconds).padStart(2, "0")}
                        <span>Seconds</span>
                      </div>
                    </div>

                    <div className="banner-delete">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // avoid opening editor
                          handleDelete(cd.id);
                        }}
                        aria-label="Delete countdown"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {editing && (
          <div className="countdown-upload-overlay">
            <div className="countdown-upload-popup">
              <button
                className="close-x"
                onClick={() => setEditing(null)}
                aria-label="Close countdown popup"
              >
                −
              </button>
              <h4 className="countdown-popup-title">
                {editing.id ? "Edit Countdown" : "Add Countdown"}
              </h4>
              <input
                className="countdown-input"
                placeholder="Title"
                value={editing.cd_title}
                onChange={(e) =>
                  setEditing({ ...editing, cd_title: e.target.value })
                }
              />
              <select
                className="countdown-input"
                value={editing.cd_emoji}
                onChange={(e) =>
                  setEditing({ ...editing, cd_emoji: e.target.value })
                }
              >
                {emojiOptions.map((emoji, idx) => (
                  <option key={idx} value={emoji}>
                    {emoji}
                  </option>
                ))}
              </select>
              <input
                className="countdown-input"
                type="date"
                value={editing.cd_target_date}
                onChange={(e) =>
                  setEditing({ ...editing, cd_target_date: e.target.value })
                }
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="countdown-upload-btn" onClick={handleSave}>
                  Save
                </button>
                {editing.id && (
                  <button
                    className="countdown-upload-btn button-danger"
                    onClick={() => handleDelete(editing.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        title="Delete countdown?"
        message="This countdown will be removed permanently."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};

export default Countdowns;
