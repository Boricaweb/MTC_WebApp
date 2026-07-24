'use client';

import React, { useState } from 'react';
import Lightbox from './Lightbox';

interface PhotoGalleryProps {
  photos: string[];
  onChange?: (photos: string[]) => void;
}

export default function PhotoGallery({ photos, onChange }: PhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onChange || !e.target.files) return;
    
    const files = Array.from(e.target.files);
    // Simulate converting to base64 for now, as in the old app
    const promises = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(base64Photos => {
      onChange([...photos, ...base64Photos]);
    });
  };

  const removePhoto = (index: number) => {
    if (!onChange) return;
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    onChange(newPhotos);
  };

  const openLightbox = (index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div>
      {onChange && (
        <div style={{ marginBottom: '16px' }}>
          <input 
            type="file" 
            accept="image/*" 
            multiple 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
            id="photo-upload" 
          />
          <label htmlFor="photo-upload" className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-icons-round">add_a_photo</span>
            เพิ่มรูปภาพ
          </label>
        </div>
      )}
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {photos.map((photo, index) => (
          <div key={index} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <img 
              src={photo} 
              alt={`รูปภาพ ${index + 1}`} 
              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
              onClick={() => openLightbox(index)}
            />
            {onChange && (
              <button 
                type="button"
                onClick={() => removePhoto(index)}
                style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(255,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <span className="material-icons-round" style={{ fontSize: '16px' }}>close</span>
              </button>
            )}
          </div>
        ))}
      </div>

      <Lightbox 
        isOpen={lightboxOpen} 
        photos={photos} 
        currentIndex={currentPhotoIndex} 
        onClose={() => setLightboxOpen(false)} 
        onNavigate={setCurrentPhotoIndex} 
      />
    </div>
  );
}
