import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import ConfirmDialog from "../components/ConfirmDialog";
import "../styles/Movies.css";
import "../styles/PageHeader.css";
import imageCompression from "browser-image-compression";

const baseURL = process.env.REACT_APP_API_URL;

const formatDateForInput = (value) => {
  if (!value) return "";
  const text = String(value).trim();
  const isoPrefixMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefixMatch) return isoPrefixMatch[1];

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (value) => {
  const normalized = formatDateForInput(value);
  if (!normalized) return "Select date";

  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return "Select date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const Movies = () => {
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const fileInput = useRef();
  const cancelUploadRef = useRef(false);

  const fetchMovies = useCallback(async () => {
    try {
      const res = await axios.get(`${baseURL}/api/movies`, {
        params: { search },
      });
      setMovies(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [search]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const handleUpload = async () => {
    if (!editingMovie) return;

    setUploading(true);
    cancelUploadRef.current = false;

    try {
      const file = fileInput.current.files?.[0];
      const formData = new FormData();

      if (file) {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        formData.append("poster", compressedFile);
      }

      formData.append("id", editingMovie.id ?? "");
      formData.append("m_name", editingMovie.m_name);
      formData.append("m_status", editingMovie.m_status);
      formData.append(
        "m_watched_date",
        editingMovie.m_watched_date?.trim() === ""
          ? "null"
          : editingMovie.m_watched_date
      );
      await axios.post(`${baseURL}/api/movies/upload`, formData);
      setEditingMovie(null);
      setSelectedFileName("");
      setSearch(""); // refresh state
      await fetchMovies();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const handleFormChange = (key, value) => {
    setEditingMovie((prev) => ({ ...prev, [key]: value }));
  };

  const handleDelete = () => {
    if (!editingMovie?.id) return;
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!editingMovie?.id) return;

    try {
      await axios.delete(`${baseURL}/api/movies/${editingMovie.id}`);
      setShowDeleteConfirm(false);
      setEditingMovie(null);
      setSearch(""); // refresh state
      await fetchMovies();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="movie-root">
      <div className="movie-wrapper">
        <div className="movie-header page-header">
          <div className="page-header-main">
            <h3 className="page-title-row">
              <span className="page-title-icon" aria-hidden="true">
                🎬
              </span>
              <span className="page-title">My Movies</span>
            </h3>
            <p className="page-subtitle">Upload watched or to-watch movies</p>
          </div>
          <div className="movie-controls page-controls">
            <label className="page-field-label" htmlFor="search">
              Search
            </label>
            <input
              type="text"
              id="search"
              className="movie-input page-control-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search movie name"
            />
            <button
              className="movie-upload-btn page-primary-btn"
              onClick={() => {
                setEditingMovie({
                  id: null,
                  m_name: "",
                  m_status: 0,
                  m_watched_date: "",
                });
                setSelectedFileName("");
              }}
            >
              <span className="button-symbol" aria-hidden="true">
                ✦
              </span>
              <span>New Movie</span>
            </button>
          </div>
        </div>

        <div className="movie-frame">
          <div className="movie-scroll">
            <div className="movie-grid">
              {movies.map((movie) => (
                <div
                  key={movie.id}
                  className="movie-card"
                  onClick={() => {
                    setEditingMovie({
                      ...movie,
                      m_watched_date: formatDateForInput(movie.m_watched_date),
                    });
                    setSelectedFileName("");
                  }}
                >
                  <div className="movie-image-wrapper">
                    <img src={movie.m_img} alt={movie.m_name} />
                    {movie.m_status === 1 && (
                      <div className="watched-badge">✔ Watched</div>
                    )}
                    {movie.m_status === 2 && (
                      <div className="watching-badge">Watching</div>
                    )}
                  </div>
                  <p>{movie.m_name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {editingMovie && (
          <div className="movie-upload-overlay">
            <div className="movie-upload-popup">
              <button
                className="movie-close-button"
                onClick={() => {
                  setEditingMovie(null);
                  setSelectedFileName("");
                }}
                aria-label="Close movie popup"
              >
                −
              </button>
              <h4 className="movie-popup-title">
                {editingMovie.id ? "Edit Movie" : "Add New Movie"}
              </h4>

              {editingMovie.m_img && (
                <img
                  src={editingMovie.m_img}
                  alt={editingMovie.m_name}
                  className="movie-popup-poster"
                />
              )}

              <input
                className="movie-input"
                placeholder="Movie Name"
                value={editingMovie.m_name}
                onChange={(e) => handleFormChange("m_name", e.target.value)}
              />
              <div className="movie-date-input-wrap">
                <div className="movie-date-display" aria-hidden="true">
                  <span className="movie-date-display-value">
                    {formatDateLabel(editingMovie.m_watched_date)}
                  </span>
                  <span className="movie-date-input-icon">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                </div>
                <input
                  className="movie-date-input-native"
                  type="date"
                  value={editingMovie.m_watched_date ?? ""}
                  onChange={(e) =>
                    handleFormChange("m_watched_date", e.target.value)
                  }
                  lang="en-CA"
                />
              </div>
              <select
                className="movie-input"
                value={editingMovie.m_status}
                onChange={(e) =>
                  handleFormChange("m_status", parseInt(e.target.value))
                }
              >
                <option value={1}>Watched</option>
                <option value={2}>Watching</option>
                <option value={0}>Not Watched</option>
              </select>
              <div className="movie-file-upload">
                <input
                  id="movie-poster-input"
                  type="file"
                  ref={fileInput}
                  accept="image/*"
                  className="movie-file-input"
                  onChange={(e) =>
                    setSelectedFileName(e.target.files?.[0]?.name || "")
                  }
                />
                <label
                  htmlFor="movie-poster-input"
                  className="movie-file-button"
                >
                  {editingMovie.m_img ? "Replace Poster" : "Choose Poster"}
                </label>
                <span className="movie-file-name">
                  {selectedFileName || "No file selected"}
                </span>
              </div>

              <div className="movie-popup-actions">
                <button className="movie-upload-btn" onClick={handleUpload}>
                  Save
                </button>
                {editingMovie.id && (
                  <button
                    className="movie-upload-btn button-danger"
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {uploading && (
          <div className="upload-overlay">
            <div className="upload-popup">
              <p>📤 Uploading poster...</p>
              <button
                className="upload-popup-action button-secondary"
                onClick={() => (cancelUploadRef.current = true)}
              >
                Pause Upload
              </button>
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Delete movie?"
          message="This movie will be removed from your list."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </div>
    </div>
  );
};

export default Movies;
