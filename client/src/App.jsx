import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import CalculatorPage from './pages/CalculatorPage';
import ArticlesPage from './pages/ArticlesPage';
import CoursePage from './pages/CoursePage';
import SparringPage from './pages/SparringPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/calculator" replace />} />
              <Route path="calculator" element={<CalculatorPage />} />
              <Route path="articles" element={<ArticlesPage />} />
              <Route path="course" element={<CoursePage />} />
              <Route path="sparring" element={<SparringPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/calculator" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
