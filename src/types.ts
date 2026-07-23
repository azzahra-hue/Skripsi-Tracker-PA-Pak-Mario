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
