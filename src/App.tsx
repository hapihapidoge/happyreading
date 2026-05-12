import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ShelfPage } from './pages/ShelfPage';
import { ReaderPage } from './pages/ReaderPage';
import './styles/index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ShelfPage />} />
        <Route path="/read/:id" element={<ReaderPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
