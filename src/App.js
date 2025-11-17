// imports
import Events from "./components/events";
import EventDetail from "./components/event-detail";
import SectionSelect from "./components/section-select";
import Checkout from "./components/checkout";
import MyTickets from "./components/my-tickets";
import NotificationTest from "./components/notification-test";

import Login from "./components/auth/login";
import Register from "./components/auth/register";

import Header from "./components/header";
import Home from "./components/home";

import { AuthProvider } from "./contexts/authContext";
import { useRoutes } from "react-router-dom";

function App() {
  const routesArray = [
    {
      path: "*",
      element: <Login />,
    },
    {
      path: "/login",
      element: <Login />,
    },
    {
      path: "/register",
      element: <Register />,
    },
    {
      path: "/home",
      element: <Home />,
    },
    {
      path: "/events",
      element: <Events />,
    },
    {
    path: "/events/:eventId/sections",
    element: <SectionSelect />, 
    },
    {
    path: "/events/:eventId/section/:sectionId",
    element: <EventDetail />,
    },
    {
      path: "/events/:eventId",
      element: <EventDetail />,
    },
    {
      path: "/checkout",
      element: <Checkout />,
    },
    {
      path: "/my-tickets",
      element: <MyTickets />,
    },
      {
        path: "/notification-test",
        element: <NotificationTest />,
      },
  ];
  let routesElement = useRoutes(routesArray);
  return (
    <AuthProvider>
      <Header />
      <div className="w-full h-screen flex flex-col">{routesElement}</div>
    </AuthProvider>
  );
}

export default App;
