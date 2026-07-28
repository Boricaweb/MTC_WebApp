'use client';

import React, { useState, useEffect } from 'react';
import { Repair } from '@/types';
import { DEPARTMENTS, REPAIR_TYPES } from '@/lib/constants';
import PhotoGallery from './PhotoGallery';

interface RepairModalProps {
  isOpen: boolean;
  repair: Repair | null;
  onClose: () => void;
  onSave: (repair: Partial<Repair>) => void;
}

export default function RepairModal({ isOpen, repair, onClose, onSave }: RepairModalProps) {
  const [formData, setFormData] = useState<Partial<Repair>>({
    reporter: '',
    department: 'อาคาร/รีเซป',
    channel: 'Line',
    subject: '',
    floor: 'G',
    type: 'ไฟฟ้า',
    dateReported: '',
    location: '',
    status: 'รอดำเนินการ',
    dateFixed: '',
    photos: []
  });

  useEffect(() => {
    if (isOpen) {
      if (repair) {
        setFormData({ ...repair });
      } else {
        const today = new Date();
        const d = String(today.getDate()).padStart(2, '0');
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const y = today.getFullYear() + 543; // Thai year
        
        setFormData({
          reporter: '',
          department: 'อาคาร/รีเซป',
          channel: 'Line',
          subject: '',
          floor: 'G',
          type: 'ไฟฟ้า',
          dateReported: `${y}-${m}-${d}`,
          location: '',
          status: 'รอดำเนินการ',
          dateFixed: '',
          photos: []
        });
      }
    }
  }, [isOpen, repair]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotosChange = (newPhotos: string[]) => {
    setFormData(prev => ({ ...prev, photos: newPhotos }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-content glass-panel" style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title">{repair ? 'แก้ไขงานซ่อม' : 'เพิ่มงานซ่อมใหม่'}</h2>
          <button className="btn-icon" onClick={onClose}>
            <span className="material-icons-round">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">ผู้แจ้ง <span style={{ color: 'var(--red-500)' }}>*</span></label>
              <input type="text" name="reporter" className="form-input" required value={formData.reporter} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">หน่วยงาน/แผนก</label>
              <select name="department" className="form-select" value={formData.department} onChange={handleChange}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">ช่องทางที่แจ้ง</label>
              <select name="channel" className="form-select" value={formData.channel} onChange={handleChange}>
                <option value="Line">Line</option>
                <option value="ใบแจ้งซ่อม">ใบแจ้งซ่อม</option>
                <option value="ส่วนตัว">ส่วนตัว</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">รายการซ่อม <span style={{ color: 'var(--red-500)' }}>*</span></label>
              <input type="text" name="subject" className="form-input" required value={formData.subject} onChange={handleChange} />
            </div>
            
            <div className="form-group">
              <label className="form-label">ชั้น</label>
              <select name="floor" className="form-select" value={formData.floor} onChange={handleChange}>
                {['G', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '12A', '14', 'ดาดฟ้า'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">ประเภทงานซ่อม</label>
              <select name="type" className="form-select" value={formData.type} onChange={handleChange}>
                {REPAIR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">วันที่แจ้ง (พ.ศ.) <span style={{ color: 'var(--red-500)' }}>*</span></label>
              <input type="text" name="dateReported" className="form-input" placeholder="YYYY-MM-DD" required value={formData.dateReported} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">สถานที่</label>
              <input type="text" name="location" className="form-input" value={formData.location} onChange={handleChange} />
            </div>
            
            <div className="form-group">
              <label className="form-label">สถานะงานซ่อม</label>
              <select name="status" className="form-select" value={formData.status} onChange={handleChange}>
                <option value="รอดำเนินการ">รอดำเนินการ</option>
                <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                <option value="เรียบร้อย">เรียบร้อย</option>
                <option value="โอนย้าย">โอนย้าย</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">วันที่ซ่อมเสร็จ (พ.ศ.)</label>
              <input type="text" name="dateFixed" className="form-input" placeholder="YYYY-MM-DD" value={formData.dateFixed} onChange={handleChange} />
            </div>
          </div>
          
          <div className="form-group" style={{ marginTop: '20px' }}>
            <label className="form-label">รูปภาพ (รองรับหลายรูป)</label>
            <PhotoGallery photos={formData.photos || []} onChange={handlePhotosChange} />
          </div>
          
          <div className="modal-footer" style={{ marginTop: '24px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary">บันทึกข้อมูล</button>
          </div>
        </form>
      </div>
    </div>
  );
}
