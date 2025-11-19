import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import QuestionnaireList from './pages/QuestionnaireList';
import QuestionnaireDetail from './pages/QuestionnaireDetail';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
        <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
        <Route path="/questionnaires" element={<MainLayout><QuestionnaireList /></MainLayout>} />
        <Route path="/questionnaires/:id" element={<MainLayout><QuestionnaireDetail /></MainLayout>} />
      </Routes>
    </BrowserRouter>
  );
}

