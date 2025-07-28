import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "../styles/Notes.css";

const baseURL = process.env.REACT_APP_API_URL;

const Notes = () => {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const loadNotes = useCallback(async () => {
    const res = await axios.get(`${baseURL}/api/notes`, { params: { search } });
    setNotes(res.data);
  }, [search]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleUpload = async () => {
    if (!editingNote) return;
    setUploading(true);
    await axios.post(`${baseURL}/api/notes/upload`, {
      id: editingNote.id ?? null,
      n_title: editingNote.n_title,
      n_content: editingNote.n_content,
    });
    await loadNotes();
    setEditingNote(null);
    setUploading(false);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm("Delete this note?")) {
      await axios.delete(`${baseURL}/api/notes/${id}`);
      await loadNotes();
    }
  };

  const handleFormChange = (key, value) => {
    setEditingNote((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="note-root">
      <div className="note-wrapper">
        <div className="note-header">
          <div>
            <h3>📝 My Notes</h3>
            <p>Keep your thoughts and ideas here</p>
          </div>
          <div className="note-controls">
            <label>Search:</label>
            <input
              className="note-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes"
            />
            <button
              className="note-upload-btn"
              onClick={() =>
                setEditingNote({ id: null, n_title: "", n_content: "" })
              }
            >
              ➕ Add New Note
            </button>
          </div>
        </div>

        <div className="note-frame">
          <div className="note-grid">
            {notes.map((note) => (
              <div key={note.id} className="note-card">
                <button
                  className="note-delete-button"
                  onClick={() => handleDeleteClick(note.id)}
                >
                  ❌
                </button>
                <div
                  className="note-title-area"
                  onClick={() => setEditingNote(note)}
                >
                  <h4 className="note-title">{note.n_title}</h4>
                </div>
                <div
                  className="note-content-area"
                  onClick={() => setEditingNote(note)}
                >
                  <pre className="note-content">{note.n_content}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>

        {editingNote && (
          <div className="note-upload-overlay">
            <div className="note-upload-popup">
              <button
                className="note-close-button"
                onClick={() => setEditingNote(null)}
              >
                ❌
              </button>
              <h4 className="note-popup-title">
                {editingNote.id ? "Edit Note" : "Add New Note"}
              </h4>
              <input
                className="note-input"
                placeholder="Title"
                value={editingNote.n_title}
                onChange={(e) => handleFormChange("n_title", e.target.value)}
              />
              <textarea
                className="note-input"
                placeholder="Content"
                value={editingNote.n_content}
                onChange={(e) => handleFormChange("n_content", e.target.value)}
                rows={6}
              />
              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button className="note-upload-btn" onClick={handleUpload}>
                  Save
                </button>
                {editingNote.id && (
                  <button
                    className="note-upload-btn"
                    style={{ backgroundColor: "#ff6b6b" }}
                    onClick={() => handleDeleteClick(editingNote.id)}
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
              <p>📤 Saving note...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notes;
