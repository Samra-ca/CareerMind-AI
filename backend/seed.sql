-- CareerMind.AI test seed data (PGAdmin / psql)
INSERT INTO user_profile (user_id, headline, bio) VALUES (1, 'Full Stack Dev', 'CareerMind test');
INSERT INTO skills (user_id, name, category) VALUES (1, 'Python', 'Language');
INSERT INTO skill_progress (skill_id, user_id, status, progress_score) VALUES (1, 1, 'learning', 40);
INSERT INTO career_goals (user_id, title, target_role) VALUES (1, 'Senior Dev', 'Senior Backend');
INSERT INTO applications (user_id, company, role, status) VALUES (1, 'Acme', 'Backend Dev', 'applied');
INSERT INTO conversations (user_id, session_title) VALUES (1, 'Career chat');
INSERT INTO memory_summaries (user_id, conversation_id, content) VALUES (1, 1, 'Test summary');
INSERT INTO mock_interviews (user_id, role, questions, score) VALUES (1, 'Backend', '["what is an API?"]'::jsonb, 85);
INSERT INTO achievements (user_id, title, badge) VALUES (1, 'First step', 'star');
INSERT INTO resume_analysis (user_id, filename, score) VALUES (1, 'resume.pdf', 78);