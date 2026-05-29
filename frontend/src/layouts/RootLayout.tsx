import { Outlet } from "react-router-dom";
import Footer from "../components/layout/Footer.tsx";
import Header from "../components/layout/Header.tsx";

function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

export default RootLayout;
