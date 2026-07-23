import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import { AppUser, Proposal, Status } from './types';
import { AuthButton } from './components/AuthButton';
import { AuthModal } from './components/AuthModal';
import { AuthScreen } from './components/AuthScreen';
import { ProposalModal } from './components/ProposalModal';
import { StatusBadge } from './components/StatusBadge';
import { SharingBoard } from './components/SharingBoard';
import { QnABoard } from './components/QnABoard';
import { Plus, Search, FileSpreadsheet, Eye, ArrowUpDown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MOTIVATION_QUOTES = [
  "Mantap! Satu langkah lebih dekat menuju wisuda. 🎓",
  "Kerja bagus! Revisi bukan berarti gagal, tapi proses menuju sempurna. ✨",
  "Semangat! Skripsi yang baik adalah skripsi yang selesai. 🚀",
  "Yey! Progress tersimpan. Jangan lupa istirahat juga ya! ☕",
  "Luar biasa! Sedikit demi sedikit, lama-lama jadi sarjana. 📚"
];

export default function App() {
  const [user, setUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('skripsi_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isGuest, setIsGuest] = useState(false);

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'progress'>('name');
  
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewProposal, setIsNewProposal] = useState(false);
  
  const [authModal, setAuthModal] = useState<{isOpen: boolean, mode: 'login' | 'register', name: string}>({isOpen: false, mode: 'login', name: ''});

  const [showMotivation, setShowMotivation] = useState(false);
  const [motivationQuote, setMotivationQuote] = useState('');

  const handleSaveSuccess = () => {
    const randomQuote = MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];
    setMotivationQuote(randomQuote);
    setShowMotivation(true);
    setTimeout(() => {
      setShowMotivation(false);
    }, 4000);
  };

  const handleAuthSuccess = (loggedInUser: AppUser) => {
    setUser(loggedInUser);
    localStorage.setItem('skripsi_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem('skripsi_user');
  };

  useEffect(() => {
    const q = query(collection(db, 'proposals'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Proposal);
      setProposals(data);
    });
    return () => unsubscribe();
  }, []);

  if (!user && !isGuest) {
    return (
      <AuthScreen 
        onSuccess={(loggedInUser) => {
          handleAuthSuccess(loggedInUser);
        }} 
        onGuest={() => setIsGuest(true)} 
      />
    );
  }

  const getProgressScore = (p: Proposal) => {
    const score = (status: Status) => {
      if (status === 'Done') return 3;
      if (status === 'Revisi') return 2;
      if (status === 'On Progress') return 1;
      return 0;
    };
    return score(p.chapter1) + score(p.chapter2) + score(p.chapter3);
  };

  const filteredProposals = proposals.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.method?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else {
      return getProgressScore(b) - getProgressScore(a);
    }
  });

  const handleOpenNew = () => {
    if (!user) {
      setAuthModal({ isOpen: true, mode: 'register', name: '' });
      return;
    }
    setSelectedProposal(null);
    setIsNewProposal(true);
    setIsModalOpen(true);
  };

  const handleRequireAuth = (name?: string) => {
    setAuthModal({ isOpen: true, mode: 'login', name: name || '' });
  };

  const handleOpenView = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setIsNewProposal(false);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white border-b border-orange-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Skripsi Tracker</h1>
              <p className="text-xs text-gray-500 font-medium">Monitoring Progress Proposal Skripsi</p>
            </div>
          </div>
          <AuthButton user={user} onLoginClick={() => setAuthModal({isOpen: true, mode: 'login', name: ''})} onLogout={handleLogout} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Motivational Header */}
        <div className="mb-8 bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-6 md:p-8 text-white shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-10 w-40 h-40 bg-orange-600 opacity-20 rounded-full blur-2xl translate-y-1/2"></div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
              Yuk, berjuang bareng! <Sparkles className="w-6 h-6 text-yellow-200" />
            </h2>
            <p className="text-orange-50 md:text-lg leading-relaxed">
              Setiap langkah kecil adalah progress yang berarti. Jangan menyerah, revisi adalah bagian dari proses pendewasaan akademik.
            </p>
          </div>
          <div className="relative z-10 shrink-0 bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20">
            <span className="font-bold text-white text-lg tracking-wide">#SuksesDuniaAkhirat</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
          <div className="p-6 border-b border-orange-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto flex-1">
              <div className="relative max-w-md w-full">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Cari nama, topik, atau metode..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <ArrowUpDown className="w-5 h-5 text-gray-400" />
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'progress')}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2 outline-none transition-all"
                >
                  <option value="name">Urutkan: A - Z</option>
                  <option value="progress">Urutkan: Progress Terbanyak</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleOpenNew}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium shadow-sm whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Tambah Proposal
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold border-b border-orange-100">Mahasiswa</th>
                  <th className="px-6 py-4 font-semibold border-b border-orange-100">Topik</th>
                  <th className="px-6 py-4 font-semibold border-b border-orange-100">Metode</th>
                  <th className="px-6 py-4 font-semibold border-b border-orange-100 text-center">Bab 1</th>
                  <th className="px-6 py-4 font-semibold border-b border-orange-100 text-center">Bab 2</th>
                  <th className="px-6 py-4 font-semibold border-b border-orange-100 text-center">Bab 3</th>
                  <th className="px-6 py-4 font-semibold border-b border-orange-100 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProposals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <FileSpreadsheet className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-base font-medium text-gray-900">Belum ada data</p>
                        <p className="text-sm">Jadilah yang pertama menambahkan progress skripsi Anda.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProposals.map((proposal) => (
                    <tr key={proposal.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{proposal.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                          {proposal.topic || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center text-sm text-gray-600">
                          {proposal.method || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={proposal.chapter1} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={proposal.chapter2} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={proposal.chapter3} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenView(proposal)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SharingBoard currentUser={user} onRequireAuth={handleRequireAuth} />
          <QnABoard currentUser={user} onRequireAuth={handleRequireAuth} />
        </div>
      </main>

      <ProposalModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        proposal={selectedProposal}
        isNew={isNewProposal}
        currentUser={user}
        onRequireAuth={handleRequireAuth}
        onSaveSuccess={handleSaveSuccess}
      />
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal(prev => ({...prev, isOpen: false}))}
        initialMode={authModal.mode}
        initialName={authModal.name}
        onSuccess={handleAuthSuccess}
      />

      <AnimatePresence>
        {showMotivation && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-white border-l-4 border-orange-500 rounded-xl shadow-2xl p-5 max-w-sm"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl mt-0.5">🌟</div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">Progress Tersimpan!</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{motivationQuote}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
