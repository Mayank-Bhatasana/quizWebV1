import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExamPlayer from "./components/ExamPlayer";
import type { QuestionAnswer, QuestionPhase } from "../../types/exam";
import { QUESTION_TIME_SECONDS } from "../../types/exam";
import { useGetAllParticipants, useGetQuestions, useRoomDetails } from "../../query/queries";
import { getTempUser } from "../../utils/tempUser";

function codeFromParam(input: string | undefined) {
  return (input ?? "").trim().replace(/\s+/g, "").toUpperCase() || "DEMO";
}

function handleComplete() {
  // TODO: complete this
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

  useEffect(() => {
    if (!roomDetails?.room) return;

    if (roomDetails.room.status === "LOBBY") {
      navigate(`/dashboard/session/${roomCode}`, { replace: true });
      return;
    }

    if (myParticipant?.isHost || !myParticipant) {
      navigate(`/room/${roomCode}/join/leaderboard`, { replace: true });
    }
  }, [roomDetails?.room, myParticipant, navigate, roomCode]);

  const totalQuestions = questions.length;
  const maxPoints = questions.reduce((sum, q) => sum + q.points, 0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);
  const [isComplete, setIsComplete] = useState(false);

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
    return selected?.isCorrect ? sum + question.points : sum;
  }, 0);

  function revealQuestion(questionId: string, selectedOptionId: string | null) {
    setAnswers((prev) => {
      if (prev[questionId]) return prev;
      return {
        ...prev,
        [questionId]: { selectedOptionId, revealedAt: Date.now() },
      };
    });
  }

  function selectOption(optionId: string) {
    if (!currentQuestionId || answers[currentQuestionId]) return;
    revealQuestion(currentQuestionId, optionId);
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
          if (currentQuestionId) {
            revealQuestion(currentQuestionId, null);
          }
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [timeLeft, phase, isComplete, currentQuestionId, answers, questions]);

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
