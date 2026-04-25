import React from "react";
import "../styles/ConfirmDialog.css";

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  disabled = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={disabled ? undefined : onCancel}>
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="confirm-dialog-close"
          onClick={onCancel}
          disabled={disabled}
          aria-label="Close dialog"
        >
          −
        </button>
        <h4 className="confirm-dialog-title">{title}</h4>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button
            className="confirm-dialog-btn confirm-dialog-btn-cancel"
            onClick={onCancel}
            disabled={disabled}
          >
            {cancelLabel}
          </button>
          <button
            className="confirm-dialog-btn confirm-dialog-btn-delete"
            onClick={onConfirm}
            disabled={disabled}
          >
            {disabled ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
