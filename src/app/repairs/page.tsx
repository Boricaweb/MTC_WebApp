'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/Topbar';
import RepairTable from '@/components/RepairTable';
import RepairModal from '@/components/RepairModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { Repair } from '@/types';
import { useSync } from '@/hooks/useSync';
import { useAuth } from '@/context/AuthContext';

export default function RepairsPage() {
  const { isAdmin } = useAuth();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [filteredRepairs, setFilteredRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { showToast } = useToast();

  const fetchRepairs = useCallback(async () => {
    try {
      const res = await fetch('/api/repairs');
      const data = await res.json();
      if (Array.isArray(data)) {
        setRepairs(data);
        setFilteredRepairs(data);
      } else {
        console.error('API returned non-array:', data);
        showToast('ไม่สามารถดึงข้อมูลงานซ่อมได้', 'error');
      }
    } catch (error) {
      console.error('Failed to fetch repairs', error);
      showToast('ไม่สามารถดึงข้อมูลงานซ่อมได้', 'error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { triggerSync } = useSync(fetchRepairs);

  useEffect(() => {
    fetchRepairs();
  }, [fetchRepairs]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredRepairs(repairs);
      return;
    }
    const lower = searchTerm.toLowerCase();
    const filtered = repairs.filter(r => 
      (r.subject && r.subject.toLowerCase().includes(lower)) ||
      (r.reporter && r.reporter.toLowerCase().includes(lower)) ||
      (r.location && r.location.toLowerCase().includes(lower)) ||
      (r.order && r.order.toLowerCase().includes(lower)) ||
      (r.status && r.status.toLowerCase().includes(lower)) ||
      (r.department && r.department.toLowerCase().includes(lower))
    );
    setFilteredRepairs(filtered);
  }, [searchTerm, repairs]);

  const handleAdd = () => {
    setEditingRepair(null);
    setModalOpen(true);
  };

  const handleEdit = (repair: Repair) => {
    setEditingRepair(repair);
    setModalOpen(true);
  };

  const handleDeleteRequest = (id: number) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/repairs/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('ลบข้อมูลเรียบร้อย', 'success');
        fetchRepairs();
        triggerSync();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      showToast('เกิดข้อผิดพลาดในการลบ', 'error');
    } finally {
      setConfirmOpen(false);
      setDeleteId(null);
    }
  };

  const handleSave = async (repairData: Partial<Repair>) => {
    try {
      if (editingRepair) {
        // Update
        const res = await fetch(`/api/repairs/${editingRepair.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(repairData)
        });
        if (res.ok) {
          showToast('แก้ไขข้อมูลเรียบร้อย', 'success');
        } else {
          throw new Error('Update failed');
        }
      } else {
        // Create
        const res = await fetch('/api/repairs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(repairData)
        });
        if (res.ok) {
          showToast('เพิ่มงานซ่อมเรียบร้อย', 'success');
        } else {
          throw new Error('Create failed');
        }
      }
      setModalOpen(false);
      fetchRepairs();
      triggerSync();
    } catch (error) {
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
  };

  return (
    <div className="page-wrapper fade-in">
      <Topbar title="รายการงานซ่อมทั้งหมด" />
      
      <div className="content-container">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div className="search-bar" style={{ position: 'relative', flex: '1', minWidth: '250px', maxWidth: '400px' }}>
              <span className="material-icons-round search-icon" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>search</span>
              <input 
                type="text" 
                className="form-input" 
                placeholder="ค้นหางานซ่อม (เรื่อง, ผู้แจ้ง, สถานที่...)" 
                style={{ paddingLeft: '48px', width: '100%' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {isAdmin && (
              <button className="btn btn-primary" onClick={handleAdd}>
                <span className="material-icons-round">add</span>
                เพิ่มงานซ่อม
              </button>
            )}
          </div>
          
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <RepairTable 
              repairs={filteredRepairs} 
              onEdit={handleEdit} 
              onDelete={handleDeleteRequest} 
            />
          )}
        </div>
      </div>

      <RepairModal 
        isOpen={modalOpen} 
        repair={editingRepair} 
        onClose={() => setModalOpen(false)} 
        onSave={handleSave} 
      />

      <ConfirmDialog 
        isOpen={confirmOpen}
        title="ยืนยันการลบ"
        message="คุณต้องการลบงานซ่อมนี้ใช่หรือไม่? (ไม่สามารถกู้คืนได้)"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
