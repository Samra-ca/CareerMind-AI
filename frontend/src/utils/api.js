import axios from 'axios';
import { getErrorMessage } from './errors';

const TOKEN_KEY = 'careermind_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    if (status && ![401, 422].includes(status)) {
      const message = getErrorMessage(error);
      window.dispatchEvent(
        new CustomEvent('careermind:api-error', { detail: message })
      );
    }
    return Promise.reject(error);
  }
);

export const registerUser = (payload) => api.post('/auth/register', payload);
export const loginUser = (payload) => api.post('/auth/login', payload);
export const loginWithGoogle = (idToken) => api.post('/auth/google', { id_token: idToken });
export const getMe = () => api.get('/auth/me');

export const getProfile = () => api.get('/profile');
export const saveProfile = (payload) => api.post('/profile', payload);
export const uploadAvatar = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getSkills = () => api.get('/skills');
export const createSkill = (payload) => api.post('/skills', payload);
export const updateSkill = (id, payload) => api.put(`/skills/${id}`, payload);
export const deleteSkill = (id) => api.delete(`/skills/${id}`);
export const analyzeSkillGap = (targetRole) =>
  api.post('/skills/analysis/requirements', { target_role: targetRole });

export const getGoals = () => api.get('/goals');
export const createGoal = (payload) => api.post('/goals', payload);
export const updateGoal = (id, payload) => api.put(`/goals/${id}`, payload);
export const completeGoal = (id) => api.patch(`/goals/${id}/complete`);
export const deleteGoal = (id) => api.delete(`/goals/${id}`);

export const getStats = () => api.get('/stats');
export const getDashboardData = () => api.get('/stats/dashboard');
export const getAchievements = () => api.get('/achievements');

export const getSalaryInsights = (role, location) =>
  api.post('/salary/insights', { role, location });

export const generateCoverLetter = (jobPosting, count, tone = 'professional', variation = 0) =>
  api.post('/coverletter/generate', {
    job_posting: jobPosting,
    count,
    tone,
    variation,
  });

export const getLatestRoadmap = () => api.get('/roadmap/latest');
export const generateRoadmap = (targetRole, duration) =>
  api.post('/roadmap/generate', { target_role: targetRole, duration });
export const updateRoadmapItem = (id, payload) => api.put(`/roadmap/items/${id}`, payload);
export const addRoadmapItem = (payload) => api.post('/roadmap/items', payload);

export const getJobRecommendations = () => api.post('/jobs/recommendations');

export const uploadResume = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const getLatestResume = () => api.get('/resume/latest');
export const getResumeAnalyses = () => api.get('/resume/analyses');
export const deleteResumeAnalysis = (id) => api.delete(`/resume/${id}`);
export const analyzeResume = (id, targetRole) =>
  api.post(`/resume/${id}/analyze`, { target_role: targetRole });

export const analyzeLinkedin = (profileText) =>
  api.post('/linkedin/analyze', { profile_text: profileText });

export const getLinkedinAnalyses = () => api.get('/linkedin/analyses');
export const deleteLinkedinAnalysis = (id) => api.delete(`/linkedin/analyses/${id}`);

export const generateInterview = (role, interviewType, questionCount, difficulty = 'Medium') =>
  api.post('/interview/generate', {
    role,
    interview_type: interviewType,
    question_count: questionCount,
    difficulty,
  });
export const submitInterviewAnswers = (id, answers) =>
  api.post(`/interview/${id}/submit`, { answers });
export const getInterviewHistory = () => api.get('/interview/history');
export const getInterview = (id) => api.get(`/interview/${id}`);
export const getInterviewBetterAnswers = (id) => api.post(`/interview/${id}/better-answers`);
export const deleteInterview = (id) => api.delete(`/interview/${id}`);

export const getApplications = () => api.get('/applications');
export const createApplication = (payload) => api.post('/applications', payload);
export const updateApplication = (id, payload) => api.put(`/applications/${id}`, payload);
export const updateApplicationStatus = (id, status) =>
  api.patch(`/applications/${id}/status`, { status });
export const deleteApplication = (id) => api.delete(`/applications/${id}`);

export const analyzeLinkedinFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/linkedin/analyze-file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getChatSessions = () => api.get('/chat/sessions');
export const createChatSession = (title) => api.post('/chat/sessions', { title });
export const getChatMessages = (id) => api.get(`/chat/sessions/${id}/messages`);
export const sendChatMessage = (id, content, att = {}) =>
  api.post(`/chat/sessions/${id}/messages`, {
    content,
    attachment_name: att.name || null,
    attachment_text: att.text || null,
  });
export const deleteChatSession = (id) => api.delete(`/chat/sessions/${id}`);
export const setMessageFeedback = (messageId, helpful) =>
  api.post(`/chat/messages/${messageId}/feedback`, { helpful });

export const apiBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const assetURL = (path) =>
  path && path.startsWith('http') ? path : `${apiBaseURL}${path}`;

export const tokenKey = TOKEN_KEY;
export default api;