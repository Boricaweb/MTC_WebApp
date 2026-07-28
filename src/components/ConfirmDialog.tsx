'use client';

import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay active">
      <div className="modal-content glass-panel" style={{ maxWidth: '400px', width: '90%', textAlign: 'center' }}>
        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <span className="material-icons-round" style={{ fontSize: '48px', color: 'var(--red-500)', margin: '0 auto 16px' }}>warning</span>
          <h2 className="modal-title">{title}</h2>
        </div>
        <div className="modal-body" style={{ padding: '16px 24px 24px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center', borderTop: 'none', paddingTop: 0 }}>
          <button className="btn btn-ghost" onClick={onCancel}>ยกเลิก</button>
          <button className="btn btn-primary" style={{ background: 'var(--red-500)' }} onClick={onConfirm}>ยืนยัน</button>
        </div>
      </div>
    </div>
  );
}
