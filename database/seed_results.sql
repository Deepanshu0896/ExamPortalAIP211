-- ============================================================================
-- SEED RESULTS DATA — IIIT Kota Online Exam System
-- Academic examination records for verified candidates
-- ============================================================================

-- Clear previous results for clean demonstration
-- ============================================================================
DELETE FROM results WHERE roll_no IN ('21CS101', '21CS102');

-- ============================================================================
-- Candidate 1: Rahul Sharma (21CS101) — CSE Undergraduate
-- ============================================================================
INSERT INTO results (roll_no, subject, score, total_marks, percentage, grade, grade_point, submission_time) VALUES
('21CS101', 'Web Development',               10, 10, 100.00, 'A+ (10 Pts)', 10, '2026-11-10 09:15:00'),
('21CS101', 'Data Structures & Algorithms',   8, 10,  80.00, 'A (9 Pts)',    9, '2026-11-10 10:30:00'),
('21CS101', 'Database Management Systems',    9, 10,  90.00, 'A+ (10 Pts)', 10, '2026-11-11 11:00:00');

-- ============================================================================
-- Candidate 2: Priya Patel (21CS102) — CSE Undergraduate
-- ============================================================================
INSERT INTO results (roll_no, subject, score, total_marks, percentage, grade, grade_point, submission_time) VALUES
('21CS102', 'Web Development',               8, 10, 80.00, 'A (9 Pts)',   9, '2026-11-10 09:45:00'),
('21CS102', 'Data Structures & Algorithms',  7, 10, 70.00, 'B+ (8 Pts)', 8, '2026-11-10 11:00:00'),
('21CS102', 'Database Management Systems',   6, 10, 60.00, 'B (7 Pts)',  7, '2026-11-11 11:30:00');

-- Verify
SELECT roll_no, subject, score, grade, submission_time FROM results ORDER BY roll_no, submission_time;
