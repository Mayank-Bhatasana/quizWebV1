import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExamPlayer from "./components/ExamPlayer";
import type { QuestionAnswer, QuestionPhase } from "../../types/exam";
import { QUESTION_TIME_SECONDS } from "../../types/exam";
import { useGetAllParticipants, useGetQuestions, useRoomDetails } from "../../query/queries";
import { getTempUser } from "../../utils/tempUser";
import { submitAnswer } from "../../services/quizApi";

function codeFromParam(input: string | undefined) {
  return (input ?? "").trim().replace(/\s+/g, "").toUpperCase() || "DEMO";
}


export default function ShowTheExam() {
  const params = useParams();
  const navigate = useNavigate();
  const roomCode = codeFromParam(params.code);
  const tempUser = getTempUser();
  const tempProfileId = tempUser?.profileId;
  const { data: roomDetails, isLoading: isLoadingRoomDetails } = useRoomDetails(roomCode);
  const { data: participantsData, isLoading: isLoadingParticipants } = useGetAllParticipants(roomCode);
  const {
    data,
    isLoading: isLoadingQuestions,
    isError: isQuestionsError,
    error: questionError,
  } = useGetQuestions(roomCode);

  const questions = data?.questions ?? [];
  const myParticipant = (participantsData?.participants ?? []).find(
    (participant) => participant.profileId === tempProfileId,
  );

  const navigatedRef = useRef(false);

  useEffect(() => {
    if (!roomDetails?.room || navigatedRef.current) return;

    if (roomDetails.room.status === "LOBBY") {
      navigatedRef.current = true;
      navigate(`/dashboard/session/${roomCode}`, { replace: true });
      return;
    }

    if (myParticipant?.isHost || !myParticipant) {
      navigatedRef.current = true;
      navigate(`/room/${roomCode}/join/leaderboard`, { replace: true });
    }
  }, [roomDetails?.room, myParticipant, navigate, roomCode]);

  useEffect(() => {
    if (roomDetails?.room?.status === "ENDED") {
      setIsComplete(true);
    }
  }, [roomDetails?.room?.status]);

  function handleComplete() {
    navigate(`/room/${roomCode}/join/leaderboard`);
  }

  const totalQuestions = questions.length;
  const maxPoints = questions.reduce((sum, q) => sum + q.points * 100, 0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);
  const [isComplete, setIsComplete] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const currentQuestion = questions[currentIndex];
  const currentQuestionId = currentQuestion?.id;
  const currentAnswer = currentQuestionId
    ? answers[currentQuestionId]
    : undefined;
  const phase: QuestionPhase = currentAnswer ? "revealed" : "answering";
  const selectedOptionId = currentAnswer?.selectedOptionId ?? null;

  const earnedPoints = questions.reduce((sum, question) => {
    const answer = answers[question.id];
    if (!answer?.selectedOptionId) return sum;
    const selected = question.options.find(
      (o) => o.id === answer.selectedOptionId,
    );
    return selected?.isCorrect ? sum + question.points * 100 : sum;
  }, 0);

  useEffect(() => {
    if (!roomCode) return;

    const wsBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000")
      .replace(/^http:/, "ws:")
      .replace(/^https:/, "wss:");

    const ws = new WebSocket(wsBaseUrl);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "subscribe",
          code: roomCode,
        }),
      );
    };

    socketRef.current = ws;

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [roomCode]);

  const submitAnswerToWs = useCallback((roomQuestionId: string, selectedOptionId: string | null, elapsedSeconds: number) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected. Trying REST fallback.");
      if (roomDetails?.room.id && myParticipant?.id) {
        submitAnswer(roomDetails.room.id, {
          participantId: myParticipant.id,
          roomQuestionId,
          selectedOptionId: selectedOptionId ?? undefined,
          timeTakenSeconds: elapsedSeconds,
        }).catch(err => console.error("REST submitAnswer fallback error:", err));
      }
      return;
    }

    if (myParticipant?.id) {
      socket.send(
        JSON.stringify({
          type: "submit_answer",
          code: roomCode,
          participantId: myParticipant.id,
          roomQuestionId,
          selectedOptionId,
          timeTakenSeconds: elapsedSeconds,
        })
      );
    }
  }, [roomDetails?.room.id, myParticipant?.id, roomCode]);

  const revealQuestion = useCallback((questionId: string, roomQuestionId: string, selectedOptionId: string | null) => {
    setAnswers((prev) => {
      if (prev[questionId]) return prev;

      const elapsedSeconds = QUESTION_TIME_SECONDS - timeLeft;
      submitAnswerToWs(roomQuestionId, selectedOptionId, elapsedSeconds);

      return {
        ...prev,
        [questionId]: { selectedOptionId, revealedAt: Date.now() },
      };
    });
  }, [timeLeft, submitAnswerToWs]);

  function selectOption(optionId: string) {
    if (!currentQuestionId || !currentQuestion || answers[currentQuestionId]) return;
    revealQuestion(currentQuestionId, currentQuestion.roomQuestionId || currentQuestion.id, optionId);
  }

  function goToQuestion(nextIndex: number) {
    const nextQuestion = questions[nextIndex];
    if (!nextQuestion) return;

    setCurrentIndex(nextIndex);
    setTimeLeft(answers[nextQuestion.id] ? 0 : QUESTION_TIME_SECONDS);
  }

  useEffect(() => {
    if (isComplete || phase === "revealed") return;

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (currentQuestionId && currentQuestion) {
            revealQuestion(currentQuestionId, currentQuestion.roomQuestionId || currentQuestion.id, null);
          }
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [timeLeft, phase, isComplete, currentQuestionId, currentQuestion, answers, questions, revealQuestion]);

  function goPrev() {
    if (currentIndex <= 0) return;
    goToQuestion(currentIndex - 1);
  }

  function goNext() {
    if (!currentQuestionId || !answers[currentQuestionId]) return;

    if (currentIndex >= totalQuestions - 1) {
      setIsComplete(true);
      return;
    }

    goToQuestion(currentIndex + 1);
  }

  if (isLoadingQuestions || isLoadingRoomDetails || isLoadingParticipants) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm font-semibold text-muted">Loading questions…</p>
      </div>
    );
  }

  if (isQuestionsError || !data?.questions) {
    console.error("Error loading questions:", questionError);
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm font-semibold text-muted">
          There was an error loading questions.
        </p>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm font-semibold text-muted">
          No questions available.
        </p>
      </div>
    );
  }

  return (
    <ExamPlayer
      roomCode={roomCode}
      question={currentQuestion}
      questionNumber={currentIndex + 1}
      totalQuestions={totalQuestions}
      timeLeft={timeLeft}
      phase={phase}
      selectedOptionId={selectedOptionId}
      onSelectOption={selectOption}
      onPrev={goPrev}
      onNext={goNext}
      canGoPrev={currentIndex > 0 && !isComplete}
      canGoNext={
        Boolean(currentQuestionId && answers[currentQuestionId]) && !isComplete
      }
      isComplete={isComplete}
      earnedPoints={earnedPoints}
      maxPoints={maxPoints}
      onComplete={handleComplete}
    />
  );
}
