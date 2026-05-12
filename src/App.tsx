import { Routes, Route, HashRouter } from 'react-router-dom';
import { ShelfPage } from './pages/ShelfPage';
import { ReaderPage } from './pages/ReaderPage';
import './styles/index.css';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ShelfPage />} />
        <Route path="/read/:id" element={<ReaderPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
