export type Status = 'To-Do' | 'On Progress' | 'Revisi' | 'Done';

export interface AppUser {
  uid: string;
  displayName: string;
}

export interface Proposal {
  id: string;
  name: string;
  topic: string;
  method: string;
  chapter1: Status;
  chapter2: Status;
  chapter3: Status;
  semproTargetDate: string;
  mentoringPlan: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
}

export interface Note {
  id: string;
  text: string;
  author: string;
  authorId: string;
  createdAt: number;
  fileName?: string;
  fileType?: string;
  fileData?: string;
}

export interface Question {
  id: string;
  text: string;
  author: string;
  authorId: string;
  createdAt: number;
}

export interface Answer {
  id: string;
  questionId: string;
  text: string;
  author: string;
  authorId: string;
  createdAt: number;
}

export interface ChapterTarget {
  id: string;
  userId: string;
  chapterKey: string; // 'chapter1' | 'chapter2' | 'chapter3' | 'chapter4' | 'chapter5' | 'sempro' | 'sidang'
  chapterTitle: string; // e.g., "Bab 1: Pendahuluan"
  status: Status;
  targetDate: string; // YYYY-MM-DD
  notes?: string;
  updatedAt: number;
}

export interface MentoringTarget {
  id: string;
  userId: string;
  title: string; // e.g. "Bimbingan Bab 1-2 & Instrumen"
  dosen: string; // e.g. "Dosen Pembimbing 1"
  targetDate: string; // YYYY-MM-DD
  status: 'Terjadwal' | 'Selesai' | 'Perlu Revisi';
  notes?: string;
  createdAt: number;
}

export interface ProgressLog {
  id: string;
  userId: string;
  title: string;
  date: string;
  category: 'Bab' | 'Bimbingan' | 'Sempro' | 'Sidang' | 'Lainnya';
  notes?: string;
  createdAt: number;
}

