import { apiFetch } from "./api";

export type GuestProfile = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  totalPoints: number;
  isTemporary: boolean;
  guestToken: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoomParticipant = {
  id: string;
  displayName: string;
  isHost: boolean;
};

export type RoomResponse = {
  id: string;
  code: string;
  status: string;
};

export async function createGuest(displayName: string) {
  return apiFetch<{ profile: GuestProfile }>("/api/guest", {
    method: "POST",
    body: { displayName },
  });
}

export async function createQuestion(input: {
  createdById: string;
  text: string;
  explanation?: string;
  options: { text: string; isCorrect?: boolean; sortOrder?: number }[];
}) {
  return apiFetch<{ question: unknown }>("/api/questions", {
    method: "POST",
    body: input,
  });
}

export async function createRoom(input: {
  hostProfileId: string;
  questions: { questionId: string; points?: number; orderIndex?: number }[];
}) {
  return apiFetch<{ room: RoomResponse }>("/api/rooms", {
    method: "POST",
    body: input,
  });
}

export async function joinRoom(code: string, input: { profileId: string; displayName: string }) {
  return apiFetch<{ roomId: string; participant: RoomParticipant }>(
    `/api/rooms/${code}/join`,
    {
      method: "POST",
      body: input,
    },
  );
}

export async function submitAnswer(roomId: string, input: {
  participantId: string;
  roomQuestionId: string;
  selectedOptionId?: string;
  timeTakenSeconds?: number;
}) {
  return apiFetch<{ answer: unknown }>(`/api/rooms/${roomId}/answer`, {
    method: "POST",
    body: input,
  });
}

export async function getScoreboard(roomId: string) {
  return apiFetch<{ scoreboard: { participantId: string; displayName: string; score: number }[] }>(
    `/api/rooms/${roomId}/scoreboard`,
  );
}
