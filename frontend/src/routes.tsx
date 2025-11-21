import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MyChildren from './pages/MyChildren';
import AllChildren from './pages/AllChildren';
import UserManagement from './pages/UserManagement';
import QuestionnaireList from './pages/QuestionnaireList';
import QuestionnaireDetail from './pages/QuestionnaireDetail';
import AssessmentForm from './pages/AssessmentForm';
import AssessmentResult from './pages/AssessmentResult';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout><Dashboard /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/my-children" element={
          <ProtectedRoute>
            <MainLayout><MyChildren /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/children" element={
          <ProtectedRoute>
            <MainLayout><AllChildren /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/users" element={
          <ProtectedRoute>
            <MainLayout><UserManagement /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/questionnaires" element={
          <ProtectedRoute>
            <MainLayout><QuestionnaireList /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/questionnaires/:id" element={
          <ProtectedRoute>
            <MainLayout><QuestionnaireDetail /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/questionnaires/:id/assessment" element={
          <ProtectedRoute>
            <MainLayout><AssessmentForm /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/assessment/:id" element={
          <ProtectedRoute>
            <MainLayout><AssessmentResult /></MainLayout>
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

