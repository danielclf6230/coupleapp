import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

export default function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  const baseURL = process.env.REACT_APP_API_URL;

  const loginUser = async () => {
    if (isLoggingIn) {
      return;
    }

    setIsLoggingIn(true);

    try {
      const res = await axios.post(
        `${baseURL}/api/auth/login`,
        { name, password },
        { withCredentials: true }
      );
      localStorage.setItem("user", JSON.stringify(res.data));

      navigate("/album");
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-page">
        <div className="login-floating-decor" aria-hidden="true">
          <span className="login-cloud login-cloud-left" />
          <span className="login-cloud login-cloud-right" />
          <span className="login-sparkle login-sparkle-left">✦</span>
          <span className="login-sparkle login-sparkle-right">✦</span>
          <span className="login-heart login-heart-top" />
          <span className="login-bow login-bow-left" />
        </div>

        <div className="welcome-header">
          <img
            src={require("../images/toothless2.png")}
            alt="toothless"
            className="pompompurin2-icon login-mascot-left"
          />
          <div className="login-hero-copy">
            <p className="login-kicker">Secret Base Entrance</p>
            <h1>Welcome Home</h1>
          </div>
          <img
            src={require("../images/pompompurin2.png")}
            alt="pompompurin"
            className="pompompurin2-icon login-mascot-right"
          />
        </div>

        <div className="login-container">
          <div className="login-card-badge" aria-hidden="true">
            Pompompurin Cafe
          </div>
          <h2 className="login-title">Login</h2>
          <p className="login-card-subtitle">Enter your little golden hideout</p>
          <div className="input-group">
            <span className="input-prefix" aria-hidden="true">
              ☁
            </span>
            <input
              placeholder="Username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              autoComplete="username"
              required
            />
          </div>
          <div className="input-group">
            <span className="input-prefix" aria-hidden="true">
              ☆
            </span>
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="login-options"></div>
          <button
            onClick={loginUser}
            className="login-button"
            disabled={isLoggingIn}
          >
            <span className="login-button-symbol" aria-hidden="true">
              ✦
            </span>
            <span>{isLoggingIn ? "Entering..." : "Login"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
