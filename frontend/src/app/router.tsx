import { createBrowserRouter } from "react-router-dom";

import RootLayout from "../layouts/RootLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import ExamLayout from "../layouts/ExamLayout"
import RouteError from "../components/errors/RouteError";

import Home from "../pages/Home";
import About from "../pages/About";
import NotFound from "../pages/errors/NotFound";
import DashboardHome from "../pages/dashboard/DashboardHome";
import SessionLobby from "../pages/dashboard/SessionLobby";
import CreateSession from "../pages/dashboard/CreateSession";
import DashboardAnalytics from "../pages/dashboard/Analytics";
import DashboardProfile from "../pages/dashboard/Profile";
import ShowTheExam from "../pages/exam/ShowTheExam";
import ShowExamLeaderBoard from "../pages/exam/ShowExamLeaderBoard";
import Login from "../pages/Login";
import RequireAuth from "../components/auth/RequireAuth";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "about",
        element: <About />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
  {
    path: "room/:code/join",
    element: <ExamLayout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <ShowTheExam />
      },
      {
        path: "leaderboard",
        element: <ShowExamLeaderBoard />
      }
    ]
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "dashboard",
        element: <DashboardLayout />,
        errorElement: <RouteError />,
        children: [
          {
            index: true,
            element: <DashboardHome />,
          },
          {
            path: "session/:code",
            element: <SessionLobby />,
          },
          {
            path: "analytics",
            element: <DashboardAnalytics />,
          },
          {
            path: "profile",
            element: <DashboardProfile />,
          },
          {
            path: "create",
            element: <CreateSession />,
          },
          {
            path: "*",
            element: <NotFound />,
          },
        ],
      },
    ],
  },
]);
