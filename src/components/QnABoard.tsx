import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, setDoc, doc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppUser, Question, Answer } from '../types';
import { HelpCircle, Send, User as UserIcon, Trash2, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface QnABoardProps {
  currentUser: AppUser | null;
  onRequireAuth: () => void;
}

export function QnABoard({ currentUser, onRequireAuth }: QnABoardProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer[]>>({});
  const [isComposing, setIsComposing] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [expandedQId, setExpandedQId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isAnswerAnonymous, setIsAnswerAnonymous] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data() as Question);
      setQuestions(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!expandedQId) return;

    const q = query(collection(db, 'answers'), where('questionId', '==', expandedQId), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data() as Answer);
      setAnswers(prev => ({ ...prev, [expandedQId]: data }));
    });
    return () => unsubscribe();
  }, [expandedQId]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!questionText.trim()) return;

    setIsSubmitting(true);
    try {
      const id = crypto.randomUUID();
      const newQuestion: Partial<Question> = {
        id,
        text: questionText.trim(),
        author: isAnonymous ? 'Anonim' : (currentUser.displayName || 'Anonim'),
        authorId: currentUser.uid,
        createdAt: Date.now(),
      };

      if (!isAnonymous && currentUser.photoURL) {
        newQuestion.authorPhoto = currentUser.photoURL;
      }

      await setDoc(doc(db, 'questions', id), newQuestion as Question);
      setQuestionText('');
      setIsAnonymous(false);
      setIsComposing(false);
    } catch (error) {
      console.error('Error adding question:', error);
      alert('Gagal mengirim pertanyaan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswer = async (e: React.FormEvent, questionId: string) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!answerText.trim()) return;

    setIsAnswering(true);
    try {
      const id = crypto.randomUUID();
      const newAnswer: Partial<Answer> = {
        id,
        questionId,
        text: answerText.trim(),
        author: isAnswerAnonymous ? 'Anonim' : (currentUser.displayName || 'Anonim'),
        authorId: currentUser.uid,
        createdAt: Date.now(),
      };

      if (!isAnswerAnonymous && currentUser.photoURL) {
        newAnswer.authorPhoto = currentUser.photoURL;
      }

      await setDoc(doc(db, 'answers', id), newAnswer as Answer);
      setAnswerText('');
      setIsAnswerAnonymous(false);
    } catch (error) {
      console.error('Error adding answer:', error);
      alert('Gagal mengirim jawaban.');
    } finally {
      setIsAnswering(false);
    }
  };

  const [deleteItem, setDeleteItem] = useState<{ type: 'question' | 'answer', id: string } | null>(null);

  const confirmDelete = async () => {
    if (!deleteItem) return;
    try {
      const collectionName = deleteItem.type === 'question' ? 'questions' : 'answers';
      await deleteDoc(doc(db, collectionName, deleteItem.id));
      setDeleteItem(null);
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const toggleExpand = (qId: string) => {
    setExpandedQId(prev => prev === qId ? null : qId);
    setAnswerText('');
  };

  return (
    <div className="bg-gradient-to-br from-white to-orange-50/50 rounded-2xl shadow-sm border border-orange-100 overflow-hidden flex flex-col h-[500px]">
      <div className="p-4 border-b border-orange-100 bg-white/50 flex items-center justify-between">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-orange-500" />
          Tanya Jawab (Q&A)
        </h3>
        {!isComposing && (
          <button
            onClick={() => {
              if (!currentUser) onRequireAuth();
              else setIsComposing(true);
            }}
            className="text-sm font-medium text-orange-600 hover:text-orange-700 bg-white px-3 py-1.5 rounded-lg border border-orange-200 shadow-sm transition-colors"
          >
            + Tanya
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {questions.length === 0 && !isComposing ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <HelpCircle className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">Belum ada pertanyaan. Tanyakan sesuatu!</p>
          </div>
        ) : (
          questions.map((q) => {
            const isExpanded = expandedQId === q.id;
            const qAnswers = answers[q.id] || [];

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={q.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {q.author === 'Anonim' || !q.authorPhoto ? (
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden", q.author === 'Anonim' ? 'bg-gray-400' : 'bg-orange-500')}>
                          {q.author === 'Anonim' ? <UserIcon className="w-4 h-4" /> : q.author.charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <img
                          src={q.authorPhoto}
                          alt={q.author}
                          className="w-8 h-8 rounded-full object-cover border border-orange-200 shadow-sm shrink-0"
                        />
                      )}
                      <div>
                        <p className="text-sm font-bold text-gray-800">{q.author}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(q.createdAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    {currentUser?.uid === q.authorId && (
                      <button onClick={() => setDeleteItem({ type: 'question', id: q.id })} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-3 rounded-2xl rounded-tl-sm border border-gray-100">
                    <p className="text-sm whitespace-pre-wrap font-medium">{q.text}</p>
                  </div>
                  
                  <button 
                    onClick={() => toggleExpand(q.id)}
                    className="mt-4 flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-800 transition-colors bg-white px-3 py-1.5 rounded-full border border-orange-200 shadow-sm w-fit"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {qAnswers.length > 0 ? `${qAnswers.length} Jawaban` : 'Jawab'}
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-200 bg-white/40"
                    >
                      <div className="p-4 space-y-4">
                        {qAnswers.map((ans) => (
                          <div key={ans.id} className="flex items-start gap-3">
                            {ans.author === 'Anonim' || !ans.authorPhoto ? (
                              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-1 shadow-sm overflow-hidden", ans.author === 'Anonim' ? 'bg-gray-400' : 'bg-orange-400')}>
                                {ans.author === 'Anonim' ? <UserIcon className="w-3 h-3" /> : ans.author.charAt(0).toUpperCase()}
                              </div>
                            ) : (
                              <img
                                src={ans.authorPhoto}
                                alt={ans.author}
                                className="w-6 h-6 rounded-full object-cover border border-orange-200 shadow-sm shrink-0 mt-1"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="text-xs font-bold text-gray-800 truncate">{ans.author}</p>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] text-gray-500">
                                    {new Date(ans.createdAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {currentUser?.uid === ans.authorId && (
                                    <button onClick={() => setDeleteItem({ type: 'answer', id: ans.id })} className="text-gray-400 hover:text-red-500 transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-3 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm">
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{ans.text}</p>
                              </div>
                            </div>
                          </div>
                        ))}

                        <form onSubmit={(e) => handleAnswer(e, q.id)} className="mt-3 relative">
                          <textarea
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            placeholder="Tulis jawaban..."
                            className="w-full text-sm border border-orange-200 rounded-lg pl-3 pr-10 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none h-14 bg-white shadow-sm"
                          />
                          <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
                            <button
                              type="submit"
                              disabled={isAnswering || !answerText.trim()}
                              className={cn(
                                "p-1.5 rounded-md text-white bg-orange-500 transition-colors",
                                (isAnswering || !answerText.trim()) ? "opacity-50 cursor-not-allowed" : "hover:bg-orange-600"
                              )}
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="mt-1 flex items-center justify-end">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isAnswerAnonymous}
                                onChange={(e) => setIsAnswerAnonymous(e.target.checked)}
                                className="rounded border-orange-200 text-orange-500 focus:ring-orange-500"
                              />
                              <span className="text-[11px] text-gray-500">Kirim anonim</span>
                            </label>
                          </div>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {isComposing && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleAskQuestion}
            className="border-t border-gray-200 bg-white p-4"
          >
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Tulis pertanyaanmu di sini..."
              className="w-full text-sm border border-orange-200 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none h-20 mb-3"
            />
            
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-orange-200 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-xs text-gray-600">Tanya sbg Anonim</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !questionText.trim()}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm",
                    (isSubmitting || !questionText.trim()) ? "opacity-50 cursor-not-allowed" : "hover:bg-orange-600"
                  )}
                >
                  {isSubmitting ? 'Mengirim...' : (
                    <>
                      Kirim <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteItem && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-100"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">Konfirmasi Hapus</h3>
              <p className="text-gray-600 text-sm mb-6">
                Apakah Anda yakin ingin menghapus {deleteItem.type === 'question' ? 'pertanyaan' : 'jawaban'} ini? 
                Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteItem(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
