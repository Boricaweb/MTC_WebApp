'use client';

import React, { useEffect } from 'react';

interface LightboxProps {
  isOpen: boolean;
  photos: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ isOpen, photos, currentIndex, onClose, onNavigate }: LightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNavigate((currentIndex + 1) % photos.length);
      if (e.key === 'ArrowLeft') onNavigate((currentIndex - 1 + photos.length) % photos.length);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length, onClose, onNavigate]);

  if (!isOpen || photos.length === 0) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button 
        onClick={onClose} 
        style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: 'white', border: 'none', cursor: 'pointer', padding: '8px' }}
      >
        <span className="material-icons-round" style={{ fontSize: '32px' }}>close</span>
      </button>

      {photos.length > 1 && (
        <button 
          onClick={() => onNavigate((currentIndex - 1 + photos.length) % photos.length)} 
          style={{ position: 'absolute', left: '20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <span className="material-icons-round">chevron_left</span>
        </button>
      )}

      <img 
        src={photos[currentIndex]} 
        alt={`รูปภาพ ${currentIndex + 1}`} 
        style={{ maxWidth: '90%', maxHeight: '90vh', objectFit: 'contain' }} 
      />

      {photos.length > 1 && (
        <button 
          onClick={() => onNavigate((currentIndex + 1) % photos.length)} 
          style={{ position: 'absolute', right: '20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <span className="material-icons-round">chevron_right</span>
        </button>
      )}
      
      <div style={{ position: 'absolute', bottom: '20px', color: 'white', background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '12px' }}>
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
}
