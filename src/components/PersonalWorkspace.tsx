import { useState, useEffect, FormEvent } from 'react';
import { ChapterTarget, MentoringTarget, ProgressLog, AppUser, Status } from '../types';
import { StatusBadge } from './StatusBadge';
import { 
  Target, 
  Calendar, 
  Clock, 
  BellRing, 
  CheckCircle2, 
  Plus, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  BookOpen, 
  UserCheck, 
  AlertTriangle, 
  FileText, 
  Lock, 
  Sparkles,
  ChevronRight,
  Info,
  Award,
  Flame,
  GraduationCap
} from 'lucide-react';
import { collection, query, where, onSnapshot, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface PersonalWorkspaceProps {
  currentUser: AppUser | null;
  onRequireAuth: () => void;
}

const DEFAULT_CHAPTER_TARGETS = [
  { key: 'chapter1', title: 'Bab 1: Pendahuluan', defaultDateOffset: 7 },
  { key: 'chapter2', title: 'Bab 2: Tinjauan Pustaka', defaultDateOffset: 14 },
  { key: 'chapter3', title: 'Bab 3: Metodologi Penelitian', defaultDateOffset: 21 },
  { key: 'chapter4', title: 'Bab 4: Hasil & Pembahasan', defaultDateOffset: 35 },
  { key: 'chapter5', title: 'Bab 5: Kesimpulan & Saran', defaultDateOffset: 45 },
  { key: 'sempro', title: 'Target Seminar Proposal (Sempro)', defaultDateOffset: 30 },
  { key: 'sidang', title: 'Target Sidang Skripsi', defaultDateOffset: 60 },
];

const ENCOURAGING_MESSAGES = [
  {
    title: 'Kerja Bagus! 🎓✨',
    message: 'Satu langkah lagi semakin dekat menuju gelar Sarjana!',
    quote: '"Langkah kecil hari ini adalah awal dari momen bahagia saat kelulusan nanti."'
  },
  {
    title: 'Luar Biasa! 🔥💪',
    message: 'Progress baru kamu berhasil dicatat!',
    quote: '"Konsistensi adalah kunci. Setiap target & bimbingan membawa kamu lebih dekat ke garis finish!"'
  },
  {
    title: 'Semangat Terus! 🚀🌟',
    message: 'Langkahmu sudah tercatat! Pertahankan ritme perjuanganmu.',
    quote: '"Tidak ada usaha yang sia-sia. Kamu pasti bisa menyelesaikan skripsi ini dengan sukses!"'
  },
  {
    title: 'Mantap Sekali! ⭐🎓',
    message: 'Rencana target kamu sudah berhasil disimpan!',
    quote: '"Fokus pada prosesnya, nikmati setiap milestone hingga kamu berdiri dengan toga wisuda!"'
  }
];

export function PersonalWorkspace({ currentUser, onRequireAuth }: PersonalWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'chapter' | 'mentoring' | 'timeline'>('chapter');

  // Firestore States
  const [chapterTargets, setChapterTargets] = useState<ChapterTarget[]>([]);
  const [mentoringTargets, setMentoringTargets] = useState<MentoringTarget[]>([]);
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals / Forms
  const [editingChapter, setEditingChapter] = useState<ChapterTarget | null>(null);
  const [editingMentoring, setEditingMentoring] = useState<MentoringTarget | null>(null);
  const [editingLog, setEditingLog] = useState<ProgressLog | null>(null);

  const [isAddChapterModalOpen, setIsAddChapterModalOpen] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterDate, setNewChapterDate] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'chapter' | 'mentoring' | 'log';
    id: string;
    title: string;
  } | null>(null);

  const [isMentoringModalOpen, setIsMentoringModalOpen] = useState(false);
  const [newMentoring, setNewMentoring] = useState<Partial<MentoringTarget>>({
    title: '',
    dosen: '',
    targetDate: '',
    status: 'Terjadwal',
    notes: ''
  });

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [newLog, setNewLog] = useState<Partial<ProgressLog>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Bab',
    notes: ''
  });

  const [motivationModal, setMotivationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    quote: string;
  } | null>(null);

  const showMotivationPopup = () => {
    const randomMsg = ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)];
    setMotivationModal({
      isOpen: true,
      title: randomMsg.title,
      message: randomMsg.message,
      quote: randomMsg.quote
    });
  };

  // Fetch Firestore Data for Current User
  useEffect(() => {
    if (!currentUser) {
      setChapterTargets([]);
      setMentoringTargets([]);
      setProgressLogs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // 1. Chapter Targets
    const qChapter = query(
      collection(db, 'user_targets'),
      where('userId', '==', currentUser.uid)
    );
    const unsubChapter = onSnapshot(qChapter, (snapshot) => {
      const data = snapshot.docs.map((d) => d.data() as ChapterTarget);
      
      // Auto initialize default chapter targets if empty
      if (data.length === 0) {
        initializeDefaultChapters(currentUser.uid);
      } else {
        setChapterTargets(data);
      }
      setIsLoading(false);
    }, (err) => {
      console.error('Error fetching chapter targets:', err);
      setIsLoading(false);
    });

    // 2. Mentoring Targets
    const qMentoring = query(
      collection(db, 'mentoring_targets'),
      where('userId', '==', currentUser.uid)
    );
    const unsubMentoring = onSnapshot(qMentoring, (snapshot) => {
      const data = snapshot.docs.map((d) => d.data() as MentoringTarget);
      setMentoringTargets(data.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()));
    }, (err) => {
      console.error('Error fetching mentoring targets:', err);
    });

    // 3. Progress Logs
    const qLogs = query(
      collection(db, 'progress_logs'),
      where('userId', '==', currentUser.uid)
    );
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const data = snapshot.docs.map((d) => d.data() as ProgressLog);
      setProgressLogs(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, (err) => {
      console.error('Error fetching progress logs:', err);
    });

    return () => {
      unsubChapter();
      unsubMentoring();
      unsubLogs();
    };
  }, [currentUser]);

  // Helper to initialize default chapter targets
  const initializeDefaultChapters = async (uid: string) => {
    const today = new Date();
    for (const item of DEFAULT_CHAPTER_TARGETS) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + item.defaultDateOffset);
      const formattedDate = targetDate.toISOString().split('T')[0];

      const newTarget: ChapterTarget = {
        id: `${uid}_${item.key}`,
        userId: uid,
        chapterKey: item.key,
        chapterTitle: item.title,
        status: 'To-Do',
        targetDate: formattedDate,
        notes: '',
        updatedAt: Date.now()
      };
      await setDoc(doc(db, 'user_targets', newTarget.id), newTarget);
    }
  };

  // Unauthenticated screen
  if (!currentUser) {
    return (
      <div className="bg-gradient-to-br from-orange-500/5 via-white to-orange-50 border border-orange-200 rounded-3xl p-8 md:p-12 text-center max-w-3xl mx-auto my-8 shadow-sm">
        <div className="w-16 h-16 bg-orange-500/10 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8" />
        </div>
        <span className="px-3 py-1 bg-orange-100 text-orange-700 font-semibold text-xs rounded-full uppercase tracking-wider">
          Personal Workspace
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-3 mb-3">
          Ruang Personal & Tracking Skripsi
        </h2>
        <p className="text-gray-600 max-w-xl mx-auto leading-relaxed mb-8">
          Fitur personal khusus pemegang akun! Pantau target per bab, kelola jadwal bimbingan dospem, rekam log progress, dan dapatkan <strong>notifikasi pengingat otomatis (H-3 & H-1)</strong> sebelum deadline skripsi kamu.
        </p>
        <button
          onClick={onRequireAuth}
          className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5"
        >
          <Sparkles className="w-5 h-5 text-yellow-200" />
          Masuk / Daftar Akun Sekarang
        </button>
      </div>
    );
  }

  // Calculate Days Remaining & Reminders
  const calculateDaysLeft = (targetDateStr: string) => {
    if (!targetDateStr) return null;
    const target = new Date(targetDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Collect All Reminders for Active Targets
  const activeReminders: { title: string; date: string; daysLeft: number; type: 'chapter' | 'mentoring' }[] = [];

  chapterTargets.forEach((ch) => {
    if (ch.status !== 'Done' && ch.targetDate) {
      const d = calculateDaysLeft(ch.targetDate);
      if (d !== null && d <= 3) {
        activeReminders.push({ title: ch.chapterTitle, date: ch.targetDate, daysLeft: d, type: 'chapter' });
      }
    }
  });

  mentoringTargets.forEach((m) => {
    if (m.status !== 'Selesai' && m.targetDate) {
      const d = calculateDaysLeft(m.targetDate);
      if (d !== null && d <= 3) {
        activeReminders.push({ title: `Bimbingan: ${m.title}`, date: m.targetDate, daysLeft: d, type: 'mentoring' });
      }
    }
  });

  // Calculate Overall Progress Score
  const totalChapters = chapterTargets.length || 1;
  const completedChapters = chapterTargets.filter((c) => c.status === 'Done').length;
  const inProgressChapters = chapterTargets.filter((c) => c.status === 'On Progress' || c.status === 'Revisi').length;
  const progressPercent = Math.round(((completedChapters * 1 + inProgressChapters * 0.5) / totalChapters) * 100);

  // Handlers for Chapter Target Edit & Creation
  const handleSaveChapter = async (target: ChapterTarget) => {
    try {
      await updateDoc(doc(db, 'user_targets', target.id), {
        chapterTitle: target.chapterTitle,
        status: target.status,
        targetDate: target.targetDate,
        notes: target.notes || '',
        updatedAt: Date.now()
      });
      setEditingChapter(null);
    } catch (err) {
      console.error('Error updating chapter:', err);
      alert('Gagal memperbarui target bab.');
    }
  };

  const handleAddChapter = async (e: FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle || !newChapterDate) {
      alert('Mohon isi judul bab dan tanggal target deadline.');
      return;
    }
    try {
      const id = `${currentUser.uid}_custom_${Date.now()}`;
      const newTarget: ChapterTarget = {
        id,
        userId: currentUser.uid,
        chapterKey: `custom_${Date.now()}`,
        chapterTitle: newChapterTitle,
        status: 'To-Do',
        targetDate: newChapterDate,
        notes: '',
        updatedAt: Date.now()
      };
      await setDoc(doc(db, 'user_targets', id), newTarget);
      setIsAddChapterModalOpen(false);
      setNewChapterTitle('');
      setNewChapterDate('');
      showMotivationPopup();
    } catch (err) {
      console.error('Error adding custom chapter target:', err);
      alert('Gagal menambah target bab.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'chapter') {
        await deleteDoc(doc(db, 'user_targets', deleteConfirm.id));
        if (editingChapter?.id === deleteConfirm.id) {
          setEditingChapter(null);
        }
      } else if (deleteConfirm.type === 'mentoring') {
        await deleteDoc(doc(db, 'mentoring_targets', deleteConfirm.id));
      } else if (deleteConfirm.type === 'log') {
        await deleteDoc(doc(db, 'progress_logs', deleteConfirm.id));
      }
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Gagal menghapus data.');
    }
  };

  // Handlers for Mentoring Target
  const handleAddMentoring = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMentoring.title || !newMentoring.targetDate) {
      alert('Mohon isi topik bimbingan dan tanggal target.');
      return;
    }
    try {
      const id = crypto.randomUUID();
      const item: MentoringTarget = {
        id,
        userId: currentUser.uid,
        title: newMentoring.title,
        dosen: newMentoring.dosen?.trim() || 'Dosen Pembimbing',
        targetDate: newMentoring.targetDate,
        status: (newMentoring.status as 'Terjadwal' | 'Selesai' | 'Perlu Revisi') || 'Terjadwal',
        notes: newMentoring.notes || '',
        createdAt: Date.now()
      };
      await setDoc(doc(db, 'mentoring_targets', id), item);
      setIsMentoringModalOpen(false);
      setNewMentoring({ title: '', dosen: '', targetDate: '', status: 'Terjadwal', notes: '' });
      showMotivationPopup();
    } catch (err) {
      console.error('Error adding mentoring target:', err);
      alert('Gagal menambah target bimbingan.');
    }
  };

  const handleSaveMentoring = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingMentoring) return;
    if (!editingMentoring.title || !editingMentoring.targetDate) {
      alert('Mohon isi topik bimbingan dan tanggal target.');
      return;
    }
    try {
      await updateDoc(doc(db, 'mentoring_targets', editingMentoring.id), {
        title: editingMentoring.title,
        dosen: editingMentoring.dosen?.trim() || 'Dosen Pembimbing',
        targetDate: editingMentoring.targetDate,
        status: editingMentoring.status,
        notes: editingMentoring.notes || ''
      });
      setEditingMentoring(null);
    } catch (err) {
      console.error('Error updating mentoring target:', err);
      alert('Gagal memperbarui target bimbingan.');
    }
  };

  const handleUpdateMentoringStatus = async (id: string, status: 'Terjadwal' | 'Selesai' | 'Perlu Revisi') => {
    try {
      await updateDoc(doc(db, 'mentoring_targets', id), { status });
    } catch (err) {
      console.error('Error updating mentoring status:', err);
    }
  };

  // Handlers for Progress Log
  const handleAddLog = async (e: FormEvent) => {
    e.preventDefault();
    if (!newLog.title || !newLog.date) {
      alert('Mohon isi judul milestone dan tanggal.');
      return;
    }
    try {
      const id = crypto.randomUUID();
      const item: ProgressLog = {
        id,
        userId: currentUser.uid,
        title: newLog.title,
        date: newLog.date,
        category: (newLog.category as 'Bab' | 'Bimbingan' | 'Sempro' | 'Sidang' | 'Lainnya') || 'Bab',
        notes: newLog.notes || '',
        createdAt: Date.now()
      };
      await setDoc(doc(db, 'progress_logs', id), item);
      setIsLogModalOpen(false);
      setNewLog({ title: '', date: new Date().toISOString().split('T')[0], category: 'Bab', notes: '' });
      showMotivationPopup();
    } catch (err) {
      console.error('Error adding log:', err);
      alert('Gagal menambah log progress.');
    }
  };

  const handleSaveLog = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    if (!editingLog.title || !editingLog.date) {
      alert('Mohon isi judul milestone dan tanggal.');
      return;
    }
    try {
      await updateDoc(doc(db, 'progress_logs', editingLog.id), {
        title: editingLog.title,
        category: editingLog.category,
        date: editingLog.date,
        notes: editingLog.notes || ''
      });
      setEditingLog(null);
    } catch (err) {
      console.error('Error updating progress log:', err);
      alert('Gagal memperbarui log progress.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP STATS & OVERALL PROGRESS CARD */}
      <div className="bg-gradient-to-br from-white via-orange-50/40 to-white border border-orange-100 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> Workspace {currentUser.displayName}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Personal Skripsi Dashboard
            </h2>
            <p className="text-sm text-gray-600">
              Pantau target per bab, tanggal bimbingan, serta reminder otomatis deadline kamu.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-orange-100 shadow-sm min-w-[280px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall Progress</span>
              <span className="text-xl font-extrabold text-orange-600">{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-3">
              <div 
                className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600 font-medium">
              <span>{completedChapters} dari {totalChapters} Target Selesai</span>
              <span>{inProgressChapters} On Progress</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. REMINDER ALERT BANNER (H-3 & H-1 DEADLINES) */}
      <AnimatePresence>
        {activeReminders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white rounded-2xl p-5 shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm shrink-0">
                <BellRing className="w-6 h-6 text-yellow-200 animate-bounce" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-extrabold text-base flex items-center gap-2">
                    Pengingat Deadline Target ({activeReminders.length} Urgen)
                  </h4>
                  <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">
                    H-3 / H-1 Alert
                  </span>
                </div>
                <p className="text-xs text-orange-100 mt-1 mb-3">
                  Ada target bab atau bimbingan yang mendekati deadline. Segera selesaikan dan kaji ulang progress kamu!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {activeReminders.map((r, i) => {
                    let badgeBg = "bg-yellow-400 text-gray-900";
                    let statusLabel = `H-${r.daysLeft} (${r.daysLeft} hari lagi)`;
                    if (r.daysLeft < 0) {
                      badgeBg = "bg-red-700 text-white";
                      statusLabel = `Terlewat ${Math.abs(r.daysLeft)} hari`;
                    } else if (r.daysLeft === 0) {
                      badgeBg = "bg-red-600 text-white animate-pulse";
                      statusLabel = "H-0 (Hari Ini!)";
                    } else if (r.daysLeft === 1) {
                      badgeBg = "bg-orange-600 text-white";
                      statusLabel = "H-1 (Besok!)";
                    }

                    return (
                      <div key={i} className="bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/20 flex items-center justify-between text-xs">
                        <div className="truncate mr-2">
                          <p className="font-bold text-white truncate">{r.title}</p>
                          <p className="text-[11px] text-orange-100 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 inline" /> {r.date}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-lg font-bold text-[10px] shrink-0 ${badgeBg}`}>
                          {statusLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-orange-100 pb-2">
        <button
          onClick={() => setActiveTab('chapter')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'chapter'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-orange-50 border border-gray-200'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Target Per Bab
        </button>

        <button
          onClick={() => setActiveTab('mentoring')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'mentoring'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-orange-50 border border-gray-200'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Target Bimbingan ({mentoringTargets.length})
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'timeline'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-orange-50 border border-gray-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Track Progress Log ({progressLogs.length})
        </button>
      </div>

      {/* 4. TAB 1: TARGET PER BAB */}
      {activeTab === 'chapter' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" /> Checklist & Target Bab Skripsi
              </h3>
              <p className="text-xs text-gray-500">Ubah judul bab, deadline, status, atau tambah target bab kustom kamu di sini</p>
            </div>
            <button
              onClick={() => setIsAddChapterModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Tambah Target Bab
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chapterTargets.map((ch) => {
              const daysLeft = calculateDaysLeft(ch.targetDate);
              const isEditing = editingChapter?.id === ch.id;

              return (
                <div
                  key={ch.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:border-orange-200 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h4 className="font-bold text-gray-900 text-base leading-tight">
                        {ch.chapterTitle}
                      </h4>
                      <StatusBadge status={ch.status} />
                    </div>

                    <div className="space-y-2 mb-4 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">Target Deadline:</span>
                        <span className="font-semibold text-gray-800">{ch.targetDate || 'Belum diatur'}</span>
                      </div>

                      {ch.status !== 'Done' && daysLeft !== null && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-400" />
                          <span className="font-medium">Sisa Waktu:</span>
                          <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                            daysLeft < 0
                              ? 'bg-red-100 text-red-700'
                              : daysLeft <= 1
                              ? 'bg-orange-100 text-orange-700'
                              : daysLeft <= 3
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {daysLeft < 0 ? `Terlewat ${Math.abs(daysLeft)} hari` : daysLeft === 0 ? 'Hari Ini!' : `${daysLeft} Hari Lagi`}
                          </span>
                        </div>
                      )}

                      {ch.notes && (
                        <div className="bg-orange-50/60 p-2.5 rounded-xl border border-orange-100 mt-2">
                          <p className="text-[11px] text-gray-700 italic">"{ch.notes}"</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={() => setDeleteConfirm({ isOpen: true, type: 'chapter', id: ch.id, title: ch.chapterTitle })}
                      className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                      title="Hapus Target Bab"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                    <button
                      onClick={() => setEditingChapter(ch)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Ubah Target
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. TAB 2: TARGET BIMBINGAN */}
      {activeTab === 'mentoring' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-orange-500" /> Jadwal & Target Bimbingan Dosen
              </h3>
              <p className="text-xs text-gray-500">Atur target bimbingan tiap bab untuk dikonsultasikan ke dosen pembimbing</p>
            </div>
            <button
              onClick={() => setIsMentoringModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Tambah Bimbingan
            </button>
          </div>

          {mentoringTargets.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
              <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="font-bold text-gray-800">Belum Ada Target Bimbingan</h4>
              <p className="text-xs text-gray-500 mt-1 mb-4">Buat jadwal bimbingan pertama kamu dengan Dosen Pembimbing!</p>
              <button
                onClick={() => setIsMentoringModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600"
              >
                <Plus className="w-4 h-4" /> Tambah Target Bimbingan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mentoringTargets.map((m) => {
                const daysLeft = calculateDaysLeft(m.targetDate);
                return (
                  <div key={m.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                          {m.dosen}
                        </span>
                        <h4 className="font-bold text-gray-900 text-base mt-1">{m.title}</h4>
                      </div>
                      <select
                        value={m.status}
                        onChange={(e) => handleUpdateMentoringStatus(m.id, e.target.value as any)}
                        className={`text-xs font-bold rounded-lg px-2.5 py-1 outline-none border cursor-pointer ${
                          m.status === 'Selesai'
                            ? 'bg-green-100 text-green-800 border-green-300'
                            : m.status === 'Perlu Revisi'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-blue-100 text-blue-800 border-blue-300'
                        }`}
                      >
                        <option value="Terjadwal">Terjadwal</option>
                        <option value="Perlu Revisi">Perlu Revisi</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-4 h-4 text-orange-500" />
                        <span>Tanggal: <strong className="text-gray-800">{m.targetDate}</strong></span>
                      </div>

                      {m.status !== 'Selesai' && daysLeft !== null && (
                        <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          daysLeft < 0 ? 'bg-red-100 text-red-700' : daysLeft <= 1 ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {daysLeft < 0 ? 'Terlewat' : daysLeft === 0 ? 'Hari Ini' : `${daysLeft} hr lagi`}
                        </span>
                      )}
                    </div>

                    {m.notes && (
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs text-gray-700">
                        <strong className="text-gray-900 block text-[11px] mb-0.5">Catatan/Hasil Bimbingan:</strong>
                        <p className="whitespace-pre-wrap text-[11px]">{m.notes}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                      <button
                        onClick={() => setEditingMentoring(m)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg border border-orange-200 transition-colors"
                        title="Edit Target Bimbingan"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ isOpen: true, type: 'mentoring', id: m.id, title: m.title })}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Hapus Target Bimbingan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 3: TRACK PROGRESS TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" /> Log Progress & Rekam Jejak
              </h3>
              <p className="text-xs text-gray-500">Catat setiap pencapaian kecil menuju kelulusan kamu</p>
            </div>
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Catat Progress Baru
            </button>
          </div>

          {progressLogs.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
              <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="font-bold text-gray-800">Belum Ada Log Progress</h4>
              <p className="text-xs text-gray-500 mt-1 mb-4">Abadikan tiap milestone skripsi kamu di sini!</p>
              <button
                onClick={() => setIsLogModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600"
              >
                <Plus className="w-4 h-4" /> Tambah Log Pertama
              </button>
            </div>
          ) : (
            <div className="relative border-l-2 border-orange-200 ml-4 space-y-6 my-4">
              {progressLogs.map((log) => (
                <div key={log.id} className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow-sm" />
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        {log.category}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{log.date}</span>
                        <button
                          onClick={() => setEditingLog(log)}
                          className="text-orange-500 hover:text-orange-700 ml-2"
                          title="Edit Log"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, type: 'log', id: log.id, title: log.title })}
                          className="text-gray-400 hover:text-red-500"
                          title="Hapus Log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-bold text-gray-900 text-sm">{log.title}</h4>
                    {log.notes && (
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">{log.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL EDIT CHAPTER TARGET */}
      {editingChapter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-lg text-gray-900">
                Ubah Target Bab
              </h3>
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: true, type: 'chapter', id: editingChapter.id, title: editingChapter.chapterTitle })}
                className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Bab
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Judul Bab / Target</label>
                <input
                  type="text"
                  required
                  value={editingChapter.chapterTitle}
                  onChange={(e) => setEditingChapter({ ...editingChapter, chapterTitle: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Status Chapter</label>
                <select
                  value={editingChapter.status}
                  onChange={(e) => setEditingChapter({ ...editingChapter, status: e.target.value as Status })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-semibold"
                >
                  <option value="To-Do">To-Do (Belum Dimulai)</option>
                  <option value="On Progress">On Progress (Sedang Dikerjakan)</option>
                  <option value="Revisi">Revisi (Tahap Perbaikan)</option>
                  <option value="Done">Done (Selesai)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Tanggal Deadline</label>
                <input
                  type="date"
                  value={editingChapter.targetDate}
                  onChange={(e) => setEditingChapter({ ...editingChapter, targetDate: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Catatan / Target Spesifik</label>
                <textarea
                  rows={3}
                  placeholder="Misal: Selesaikan analisis data kuantitatif & pembahasan..."
                  value={editingChapter.notes || ''}
                  onChange={(e) => setEditingChapter({ ...editingChapter, notes: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingChapter(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveChapter(editingChapter)}
                className="px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADD CHAPTER TARGET */}
      {isAddChapterModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddChapter} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2">
              Tambah Target Bab Kustom
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Judul Bab / Target</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Bab 6: Analisis Tambahan / Draft Jurnal"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Tanggal Deadline</label>
                <input
                  type="date"
                  required
                  value={newChapterDate}
                  onChange={(e) => setNewChapterDate(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsAddChapterModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm"
              >
                Tambah Target Bab
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL ADD MENTORING */}
      {isMentoringModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddMentoring} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2">
              Tambah Target Bimbingan
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Topik / Rencana Bimbingan</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Konsultasi Revisi Bab 1 & Bab 2"
                  value={newMentoring.title}
                  onChange={(e) => setNewMentoring({ ...newMentoring, title: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Dosen Pembimbing</label>
                <input
                  type="text"
                  placeholder="Contoh: Pak Haji"
                  value={newMentoring.dosen || ''}
                  onChange={(e) => setNewMentoring({ ...newMentoring, dosen: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Tanggal Bimbingan</label>
                <input
                  type="date"
                  required
                  value={newMentoring.targetDate}
                  onChange={(e) => setNewMentoring({ ...newMentoring, targetDate: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Bawa berkas yang sudah dicetak / siapkan draft PPT..."
                  value={newMentoring.notes}
                  onChange={(e) => setNewMentoring({ ...newMentoring, notes: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsMentoringModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm"
              >
                Tambah Bimbingan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL ADD LOG */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddLog} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2">
              Catat Log Progress
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Judul Pencapaian / Milestone</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Bab 1 Disetujui Pak Dosen!"
                  value={newLog.title}
                  onChange={(e) => setNewLog({ ...newLog, title: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kategori</label>
                  <select
                    value={newLog.category}
                    onChange={(e) => setNewLog({ ...newLog, category: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-medium"
                  >
                    <option value="Bab">Bab Skripsi</option>
                    <option value="Bimbingan">Bimbingan</option>
                    <option value="Sempro">Seminar Proposal</option>
                    <option value="Sidang">Sidang Skripsi</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={newLog.date}
                    onChange={(e) => setNewLog({ ...newLog, date: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Detail / Catatan</label>
                <textarea
                  rows={3}
                  placeholder="Dosen menyetujui latar belakang dan meminta lanjut ke instrumen..."
                  value={newLog.notes}
                  onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm"
              >
                Simpan Log
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL EDIT MENTORING */}
      {editingMentoring && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveMentoring} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-lg text-gray-900">
                Edit Target Bimbingan
              </h3>
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: true, type: 'mentoring', id: editingMentoring.id, title: editingMentoring.title })}
                className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Topik / Rencana Bimbingan</label>
                <input
                  type="text"
                  required
                  value={editingMentoring.title}
                  onChange={(e) => setEditingMentoring({ ...editingMentoring, title: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Dosen Pembimbing</label>
                <input
                  type="text"
                  placeholder="Contoh: Pak Haji"
                  value={editingMentoring.dosen || ''}
                  onChange={(e) => setEditingMentoring({ ...editingMentoring, dosen: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Tanggal Bimbingan</label>
                <input
                  type="date"
                  required
                  value={editingMentoring.targetDate}
                  onChange={(e) => setEditingMentoring({ ...editingMentoring, targetDate: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Status Bimbingan</label>
                <select
                  value={editingMentoring.status}
                  onChange={(e) => setEditingMentoring({ ...editingMentoring, status: e.target.value as any })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-medium"
                >
                  <option value="Terjadwal">Terjadwal</option>
                  <option value="Perlu Revisi">Perlu Revisi</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={editingMentoring.notes}
                  onChange={(e) => setEditingMentoring({ ...editingMentoring, notes: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingMentoring(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL EDIT LOG */}
      {editingLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveLog} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-lg text-gray-900">
                Edit Log Progress
              </h3>
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: true, type: 'log', id: editingLog.id, title: editingLog.title })}
                className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Judul Pencapaian / Milestone</label>
                <input
                  type="text"
                  required
                  value={editingLog.title}
                  onChange={(e) => setEditingLog({ ...editingLog, title: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kategori</label>
                  <select
                    value={editingLog.category}
                    onChange={(e) => setEditingLog({ ...editingLog, category: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-medium"
                  >
                    <option value="Bab">Bab Skripsi</option>
                    <option value="Bimbingan">Bimbingan</option>
                    <option value="Sempro">Seminar Proposal</option>
                    <option value="Sidang">Sidang Skripsi</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={editingLog.date}
                    onChange={(e) => setEditingLog({ ...editingLog, date: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Detail / Catatan</label>
                <textarea
                  rows={3}
                  value={editingLog.notes}
                  onChange={(e) => setEditingLog({ ...editingLog, notes: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CONFIRMATION DELETE */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">Konfirmasi Hapus</h3>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                Apakah Anda yakin ingin menghapus <strong className="text-gray-900">"{deleteConfirm.title}"</strong>?
              </p>
            </div>
            <div className="flex justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POP-UP SEMANGAT / MOTIVATION POPUP */}
      <AnimatePresence>
        {motivationModal && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5 text-center relative overflow-hidden border border-orange-100"
            >
              {/* Background Glow Decorative Pattern */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-200/50 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-200/50 rounded-full blur-2xl pointer-events-none" />

              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-amber-400 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-orange-500/30 transform rotate-3 hover:rotate-0 transition-transform">
                  <Sparkles className="w-9 h-9" />
                </div>
                <div className="absolute -top-1 -right-2 bg-amber-100 text-amber-700 p-1 rounded-full border border-amber-300 shadow-sm">
                  <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-black text-xl text-gray-900 tracking-tight">
                  {motivationModal.title}
                </h3>
                <p className="text-xs text-gray-600 font-medium">
                  {motivationModal.message}
                </p>
              </div>

              <div className="p-3.5 bg-gradient-to-br from-orange-50 to-amber-50/60 rounded-2xl border border-orange-100 text-xs text-orange-900 italic font-serif leading-relaxed shadow-inner">
                {motivationModal.quote}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setMotivationModal(null)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <GraduationCap className="w-4 h-4" /> Siap, Semangat Lanjut Skripsi! 🚀
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
