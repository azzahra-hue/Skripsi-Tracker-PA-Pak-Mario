import { useState, useEffect, ChangeEvent } from 'react';
import { Proposal, Status, AppUser } from '../types';
import { StatusBadge } from './StatusBadge';
import { X, Edit2, Save, Trash2, Calendar, BookOpen, FileText } from 'lucide-react';
import { doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';

interface ProposalModalProps {
  proposal: Proposal | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  isNew?: boolean;
  onRequireAuth?: (name?: string) => void;
}

const statusOptions: Status[] = ['To-Do', 'On Progress', 'Revisi', 'Done'];

export function ProposalModal({ proposal, isOpen, onClose, currentUser, isNew = false, onRequireAuth }: ProposalModalProps) {
  const [isEditing, setIsEditing] = useState(isNew);
  const [formData, setFormData] = useState<Partial<Proposal>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (proposal) {
      setFormData(proposal);
      setIsEditing(isNew);
    } else if (isNew && currentUser) {
      setFormData({
        name: currentUser.displayName || '',
        topic: '',
        method: '',
        chapter1: 'To-Do',
        chapter2: 'To-Do',
        chapter3: 'To-Do',
        semproTargetDate: '',
        mentoringPlan: '',
      });
      setIsEditing(true);
    }
  }, [proposal, isNew, currentUser]);

  if (!isOpen) return null;

  const isOwner = currentUser?.uid === proposal?.ownerId || isNew;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      if (isNew) {
        const id = crypto.randomUUID();
        const newProposal: Proposal = {
          id,
          name: formData.name || '',
          topic: formData.topic || '',
          method: formData.method || '',
          chapter1: formData.chapter1 as Status || 'To-Do',
          chapter2: formData.chapter2 as Status || 'To-Do',
          chapter3: formData.chapter3 as Status || 'To-Do',
          semproTargetDate: formData.semproTargetDate || '',
          mentoringPlan: formData.mentoringPlan || '',
          ownerId: currentUser.uid,
          ownerName: currentUser.displayName || 'Unknown',
          createdAt: Date.now(),
        };
        await setDoc(doc(db, 'proposals', id), newProposal);
      } else if (proposal) {
        await updateDoc(doc(db, 'proposals', proposal.id), formData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Gagal menyimpan data.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!proposal || !window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      await deleteDoc(doc(db, 'proposals', proposal.id));
      onClose();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Gagal menghapus data.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {isNew ? 'Tambah Proposal Baru' : 'Detail Proposal Skripsi'}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => {
                  if (currentUser?.uid === proposal?.ownerId) {
                    setIsEditing(true);
                  } else {
                    onRequireAuth?.(proposal?.ownerName);
                  }
                }}
                className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
                title="Edit"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Mahasiswa Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Mahasiswa</label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="Masukkan nama"
                />
              ) : (
                <p className="text-gray-900 font-medium">{proposal?.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Topik Skripsi</label>
              {isEditing ? (
                <input
                  type="text"
                  name="topic"
                  value={formData.topic || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="Contoh: Machine Learning"
                />
              ) : (
                <p className="text-gray-900">{proposal?.topic || '-'}</p>
              )}
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Metode Penelitian</label>
            {isEditing ? (
              <input
                type="text"
                name="method"
                value={formData.method || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                placeholder="Contoh: Kualitatif / Kuantitatif / Eksperimen"
              />
            ) : (
              <p className="text-gray-900">{proposal?.method || '-'}</p>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* Progress Bab */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-orange-600" />
              Progress Penulisan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['chapter1', 'chapter2', 'chapter3'].map((chapter, index) => (
                <div key={chapter} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bab {index + 1}</label>
                  {isEditing ? (
                    <select
                      name={chapter}
                      value={formData[chapter as keyof Proposal] || 'To-Do'}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white text-sm"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <StatusBadge status={proposal?.[chapter as keyof Proposal] as Status} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Target & Jadwal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-orange-600" />
                Target Tanggal Sempro
              </h3>
              {isEditing ? (
                <input
                  type="date"
                  name="semproTargetDate"
                  value={formData.semproTargetDate || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                />
              ) : (
                <p className="text-gray-700 text-sm">{proposal?.semproTargetDate ? new Date(proposal.semproTargetDate).toLocaleDateString('id-ID') : 'Belum ditentukan'}</p>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-orange-600" />
                Rencana Bimbingan
              </h3>
              {isEditing ? (
                <input
                  type="date"
                  name="mentoringPlan"
                  value={formData.mentoringPlan || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                />
              ) : (
                <p className="text-gray-700 text-sm">{proposal?.mentoringPlan ? new Date(proposal.mentoringPlan).toLocaleDateString('id-ID') : 'Belum ada jadwal'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {isEditing && (
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between z-10 rounded-b-2xl">
            {!isNew && isOwner ? (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Hapus
              </button>
            ) : (
              <div></div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (isNew) onClose();
                  else setIsEditing(false);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 bg-gray-100 rounded-lg font-medium transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 text-white bg-orange-500 hover:bg-orange-600 rounded-lg font-medium transition-colors shadow-sm text-sm",
                  isSaving && "opacity-70 cursor-not-allowed"
                )}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
