import { Routes, Route, Navigate } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import SkillsPage from './pages/SkillsPage';
import SkillGapPage from './pages/SkillGapPage';
import GoalsPage from './pages/GoalsPage';
import ChatPage from './pages/ChatPage';
import RoadmapPage from './pages/RoadmapPage';
import JobsPage from './pages/JobsPage';
import ResumePage from './pages/ResumePage';
import LinkedInPage from './pages/LinkedInPage';
import MockInterviewPage from './pages/MockInterviewPage';
import ApplicationsPage from './pages/ApplicationsPage';
import AchievementsPage from './pages/AchievementsPage';
import SalaryPage from './pages/SalaryPage';
import CoverLetterPage from './pages/CoverLetterPage';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalToast from './components/GlobalToast';

const protectedRoute = (el) => <ProtectedRoute>{el}</ProtectedRoute>;

const App = () => {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={protectedRoute(<DashboardPage />)} />
        <Route path="/profile" element={protectedRoute(<ProfilePage />)} />
        <Route path="/skills" element={protectedRoute(<SkillsPage />)} />
        <Route path="/skill-gap" element={protectedRoute(<SkillGapPage />)} />
        <Route path="/goals" element={protectedRoute(<GoalsPage />)} />
        <Route path="/chat" element={protectedRoute(<ChatPage />)} />
        <Route path="/roadmap" element={protectedRoute(<RoadmapPage />)} />
        <Route path="/jobs" element={protectedRoute(<JobsPage />)} />
        <Route path="/resume" element={protectedRoute(<ResumePage />)} />
        <Route path="/linkedin" element={protectedRoute(<LinkedInPage />)} />
        <Route path="/interview" element={protectedRoute(<MockInterviewPage />)} />
        <Route path="/applications" element={protectedRoute(<ApplicationsPage />)} />
        <Route path="/achievements" element={protectedRoute(<AchievementsPage />)} />
        <Route path="/salary" element={protectedRoute(<SalaryPage />)} />
        <Route path="/cover-letter" element={protectedRoute(<CoverLetterPage />)} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <GlobalToast />
    </ErrorBoundary>
  );
};

export default App;