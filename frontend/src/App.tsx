import "./index.css";
import Header from "./pages/Header.tsx";
import Home from "./pages/Home.tsx";

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Home />
      </main>
    </div>
  );
}

export default App;
