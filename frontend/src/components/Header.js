import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import "../styles/Header.css";
import snowVideo from "../images/snow.gif";
import axios from "axios";

const baseURL = process.env.REACT_APP_API_URL;

export default function Header() {
  const [daysTogether, setDaysTogether] = useState(0);

  const [avatarLeft, setAvatarLeft] = useState();
  const [avatarRight, setAvatarRight] = useState();

  const handleAvatarUpload = async (e, userId, setAvatarState) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);
    formData.append("userId", userId);

    try {
      const res = await axios.post(
        `${baseURL}/api/users/upload-avatar`,
        formData
      );
      setAvatarState(res.data.url);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    }
  };

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const res1 = await axios.get(`${baseURL}/api/users/1`);
        const res3 = await axios.get(`${baseURL}/api/users/3`);
        setAvatarLeft(res1.data.avatarUrl);
        setAvatarRight(res3.data.avatarUrl);
      } catch (err) {
        console.error("Fetch avatars failed:", err);
      }
    };
    fetchAvatars();
  }, []);

  useEffect(() => {
    const start = new Date("2024-09-15");
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    setDaysTogether(diff);
  }, []);

  return (
    <div className="header">
      <div className="header-banner">
        <video className="banner-video" autoPlay loop muted>
          <source src={snowVideo} type="video/gif" />
          Your browser does not support the video tag.
        </video>

        <button
          className="logout-btn"
          onClick={() => {
            localStorage.removeItem("user");
            window.location.href = "/";
          }}
        >
          Logout
        </button>

        <div className="banner-overlay">
          <h2 className="fade-in">
            <img
              src={require("../images/toothless.png")}
              alt="toothless"
              className="toothless-icon"
            />
            Our Secret Base
            <img
              src={require("../images/pompompurin.png")}
              alt="pompompurin"
              className="pompompurin-icon"
            />
          </h2>

          <div className="avatars">
            <div className="avatar-left">
              <label htmlFor="avatar-left">
                <img
                  src={avatarLeft}
                  alt="user 1"
                  className="clickable-avatar"
                />
              </label>
              <input
                id="avatar-left"
                type="file"
                style={{ display: "none" }}
                accept="image/*"
                onChange={(e) => handleAvatarUpload(e, 1, setAvatarLeft)}
              />
            </div>

            <div className="days-together-text">
              <p className="days-count">{daysTogether}</p>
              <p className="days-label">
                Together <span className="heart-icon">❤️</span> Days
              </p>
            </div>

            <div className="avatar-right">
              <label htmlFor="avatar-right">
                <img
                  src={avatarRight}
                  alt="user 3"
                  className="clickable-avatar"
                />
              </label>
              <input
                id="avatar-right"
                type="file"
                style={{ display: "none" }}
                accept="image/*"
                onChange={(e) => handleAvatarUpload(e, 3, setAvatarRight)}
              />
            </div>
          </div>
        </div>
      </div>

      <nav className="nav-tabs">
        <NavLink
          to="/album"
          className={({ isActive }) => (isActive ? "active" : undefined)}
        >
          Album
        </NavLink>
        <NavLink
          to="/movies"
          className={({ isActive }) => (isActive ? "active" : undefined)}
        >
          Movie list
        </NavLink>
        <NavLink
          to="/countdowns"
          className={({ isActive }) => (isActive ? "active" : undefined)}
        >
          Count Down
        </NavLink>
        <NavLink
          to="/notes"
          className={({ isActive }) => (isActive ? "active" : undefined)}
        >
          Notes
        </NavLink>
      </nav>
    </div>
  );
}
