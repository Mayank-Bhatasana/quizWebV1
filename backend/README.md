# Backend API Documentation

## Overview
This backend provides guest sessions, question creation, live quiz rooms, and answer submission.
All endpoints return JSON.

Base URL (dev): `http://localhost:3000`

## Setup
1) Install dependencies:
```bash
pnpm install
```

2) Configure environment variables:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/quizhub?schema=public"
```

3) Run migrations:
```bash
pnpm prisma migrate dev --name init
```

4) Start server:
```bash
pnpm dev
```

## Authentication
Guest access uses an httpOnly cookie named `quiz_guest`.
Clients should call `POST /api/guest` once and then send cookies on subsequent requests.

## Endpoints

### Health
`GET /`

Response:
```json
{ "message": "Backend working!" }
```

### Create or load guest profile
`POST /api/guest`

Request body:
```json
{ "displayName": "Player 1" }
```

Response:
```json
{
  "profile": {
    "id": "...",
    "username": "Player 1",
    "isTemporary": true,
    "guestToken": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

Notes:
- Sets httpOnly cookie `quiz_guest` if a new profile is created.
- If cookie exists and matches a profile, it returns that profile.

### Create question
`POST /api/questions`

Request body:
```json
{
  "createdById": "profile-uuid",
  "text": "What is 2 + 2?",
  "explanation": "Simple math",
  "options": [
    { "text": "3", "isCorrect": false },
    { "text": "4", "isCorrect": true }
  ]
}
```

Response:
```json
{
  "question": {
    "id": "...",
    "text": "What is 2 + 2?",
    "options": [
      { "id": "...", "text": "3", "isCorrect": false, "sortOrder": 0 },
      { "id": "...", "text": "4", "isCorrect": true, "sortOrder": 1 }
    ]
  }
}
```

### Create room
`POST /api/rooms`

Request body:
```json
{
  "hostProfileId": "profile-uuid",
  "questions": [
    { "questionId": "question-uuid", "points": 5 }
  ]
}
```

Response:
```json
{
  "room": {
    "id": "...",
    "code": "AB12CD",
    "status": "LOBBY",
    "participants": [
      { "id": "...", "displayName": "Host", "isHost": true }
    ]
  }
}
```

### Join room
`POST /api/rooms/:code/join`

Request body:
```json
{ "profileId": "profile-uuid", "displayName": "Player 2" }
```

Response:
```json
{ "roomId": "room-uuid", "participant": { "id": "..." } }
```

### Submit answer
`POST /api/rooms/:roomId/answer`

Request body:
```json
{
  "participantId": "participant-uuid",
  "roomQuestionId": "room-question-uuid",
  "selectedOptionId": "option-uuid",
  "timeTakenSeconds": 8
}
```

Response:
```json
{ "answer": { "id": "...", "isCorrect": true } }
```

### Get scoreboard
`GET /api/rooms/:roomId/scoreboard`

Response:
```json
{
  "scoreboard": [
    { "participantId": "...", "displayName": "Player 1", "score": 10 }
  ]
}
```

## Error responses
Errors return a 4xx status and JSON:
```json
{ "error": "Reason" }
```
