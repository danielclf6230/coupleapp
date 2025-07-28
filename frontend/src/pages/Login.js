import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

export default function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const baseURL = process.env.REACT_APP_API_URL;

  const loginUser = async () => {
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
    }
  };

  return (
    <div className="login-root">
      <div className="login-page">
        <div className="welcome-header">
          <h1>Welcome Home</h1>
          <img
            src={require("../images/pompompurin2.png")}
            alt="pompompurin"
            className="pompompurin2-icon"
          />
        </div>

        <div className="login-container">
          <h2 className="login-title">Login</h2>
          <div className="input-group">
            <i className="fas fa-user icon"></i>
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
            <i className="fas fa-lock icon"></i>
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
          <button onClick={loginUser} className="login-button">
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
