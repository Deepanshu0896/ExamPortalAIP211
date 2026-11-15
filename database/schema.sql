-- ============================================================================
-- ONLINE EXAM SYSTEM DATABASE SCHEMA (schema.sql)
-- Academic Target: IIIT Kota B.Tech CSE Online Examination System
-- Description: Relational MySQL schema supporting dynamic subjects, 
--              question bank, candidate authentication, and 10-point grade evaluations.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 1: `users`
-- Stores candidate and administrator authentication records
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `roll_no` VARCHAR(20) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `branch` VARCHAR(50) DEFAULT 'CSE',
    `role` ENUM('student', 'admin') DEFAULT 'student',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 2: `subjects`
-- Stores dynamically configured course examination papers and access locks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subjects` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(20) NOT NULL UNIQUE,          -- e.g. WT, DS, DBMS, CN
    `course_code` VARCHAR(20) NOT NULL,          -- e.g. CS201, CS202, CS203
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT,
    `status` ENUM('active', 'locked') DEFAULT 'active',
    `total_marks` INT DEFAULT 10,
    `num_questions` INT DEFAULT 5,              -- Number of questions shown per exam (randomized from pool)
    `duration_mins` INT DEFAULT 10,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 3: `questions`
-- Stores question bank items per subject with multiple-choice keys & marks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `questions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `subject_code` VARCHAR(20) NOT NULL,
    `subject_name` VARCHAR(100) NOT NULL,
    `question_text` TEXT NOT NULL,
    `opt_a` VARCHAR(255) NOT NULL,
    `opt_b` VARCHAR(255) NOT NULL,
    `opt_c` VARCHAR(255) NOT NULL,
    `opt_d` VARCHAR(255) NOT NULL,
    `correct_opt` CHAR(1) NOT NULL, -- 'A', 'B', 'C', or 'D'
    `marks` DECIMAL(3,1) DEFAULT 2.0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (`subject_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 4: `results`
-- Stores candidate submission evaluations based on IIIT Kota 10-point scale
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `results` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `roll_no` VARCHAR(20) NOT NULL,
    `subject` VARCHAR(100) NOT NULL,
    `score` INT NOT NULL,
    `total_marks` INT NOT NULL DEFAULT 10,
    `percentage` DECIMAL(5,2) NOT NULL,
    `grade` VARCHAR(15) NOT NULL,          -- e.g. A+ (10 Pts), A (9 Pts)
    `grade_point` INT NOT NULL DEFAULT 0,  -- 10, 9, 8, 7, 6, 5, 4, 0
    `submission_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (`roll_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- SEED DATA (Ready-to-use demo data for evaluation)
-- ============================================================================

-- 1. Insert Candidate and Admin Users
INSERT INTO `users` (`roll_no`, `name`, `email`, `password`, `branch`, `role`) VALUES
('21CS101', 'Rahul Sharma', 'rahul@iiitkota.ac.in', 'pass123', 'CSE', 'student'),
('21CS102', 'Priya Patel', 'priya@iiitkota.ac.in', 'pass123', 'CSE', 'student'),
('ADMIN01', 'Prof. Dr. Mehta', 'admin@iiitkota.ac.in', 'admin123', 'CSE', 'admin')
ON DUPLICATE KEY UPDATE `name`=`name`;

-- 2. Insert Standard Examination Subjects (Active vs Locked)
INSERT INTO `subjects` (`code`, `course_code`, `name`, `description`, `status`, `total_marks`, `duration_mins`) VALUES
('WT', 'CS201', 'Web Development', 'HTML5 Semantics, CSS3 Flexbox/Grid, JavaScript DOM, PHP and MySQL integration.', 'active', 10, 10),
('DS', 'CS202', 'Data Structures & Algorithms', 'Asymptotic analysis, linear structures, trees, BST, heaps, and graph traversals.', 'active', 10, 10),
('DBMS', 'CS203', 'Database Management Systems', 'ER Modeling, Relational Algebra, SQL queries, Normalization (1NF-BCNF), and ACID properties.', 'locked', 10, 10)
ON DUPLICATE KEY UPDATE `name`=`name`;

-- 3. Insert Question Bank Items (Distinct Questions for each subject)

-- (A) Subject 1: Web Development (CS201)
INSERT INTO `questions` (`subject_code`, `subject_name`, `question_text`, `opt_a`, `opt_b`, `opt_c`, `opt_d`, `correct_opt`, `marks`) VALUES
('WT', 'Web Development', 'Which of the following is considered an HTML5 Semantic Tag that describes structural meaning to browser and search engine?', '<div>', '<article>', '<span>', '<font>', 'B', 2.0),
('WT', 'Web Development', 'In HTML5 markup, which pair of tags is correctly applied to render chemical formulas such as H2O and algebraic powers such as (a+b)2?', 'H<sub>2</sub>O and (a+b)<sup>2</sup>', 'H<sup>2</sup>O and (a+b)<sub>2</sub>', 'H2O and (a+b)^2', 'H<big>2</big>O and (a+b)<small>2</small>', 'A', 2.0),
('WT', 'Web Development', 'What does CSS transform: rotateY(180deg) with perspective: 1000px produce on an HTML element?', '2D Vertical Translation', '3D horizontal flip rotation along Y-axis', 'Scales element by 180%', 'Changes display to inline', 'B', 2.0),
('WT', 'Web Development', 'Which HTML attribute is used within a <td> or <th> element to merge adjacent cells vertically across rows?', 'colspan', 'rowspan', 'cellmerge', 'vspan', 'B', 2.0),
('WT', 'Web Development', 'For z-index to take effect on an HTML element, what condition must be satisfied?', 'The element must have a defined position (relative, absolute, fixed, or sticky)', 'The element must have colspan attribute', 'The element must contain a marquee tag', 'The element opacity must be 0.5', 'A', 2.0);

-- (B) Subject 2: Data Structures & Algorithms (CS202)
INSERT INTO `questions` (`subject_code`, `subject_name`, `question_text`, `opt_a`, `opt_b`, `opt_c`, `opt_d`, `correct_opt`, `marks`) VALUES
('DS', 'Data Structures & Algorithms', 'What is the worst-case time complexity of standard Quick Sort when the pivot is consistently an extreme element?', 'O(N log N)', 'O(N^2)', 'O(N)', 'O(log N)', 'B', 2.0),
('DS', 'Data Structures & Algorithms', 'Which data structure strictly enforces Last-In-First-Out (LIFO) and is utilized by compilers for recursion call stacks?', 'Queue', 'Stack', 'Linked List', 'Hash Table', 'B', 2.0),
('DS', 'Data Structures & Algorithms', 'In a valid Binary Search Tree (BST), what property must all keys in the left subtree of node X satisfy?', 'Keys strictly greater than X', 'Keys strictly less than X', 'Keys equal to 2*X', 'No ordering constraint', 'B', 2.0),
('DS', 'Data Structures & Algorithms', 'What is the minimum number of pointer fields required in a node of a Doubly Linked List?', '1 pointer', '2 pointers', '3 pointers', '4 pointers', 'B', 2.0),
('DS', 'Data Structures & Algorithms', 'Which auxiliary data structure is primarily utilized by the Breadth-First Search (BFS) graph traversal algorithm?', 'Queue (FIFO)', 'Stack (LIFO)', 'Min-Heap', 'Disjoint Set Union', 'A', 2.0);

-- (C) Subject 3: Database Management Systems (CS203) [Locked Paper Question Bank]
INSERT INTO `questions` (`subject_code`, `subject_name`, `question_text`, `opt_a`, `opt_b`, `opt_c`, `opt_d`, `correct_opt`, `marks`) VALUES
('DBMS', 'Database Management Systems', 'Which ACID property ensures that all operations within a database transaction are completed successfully or none are applied?', 'Atomicity', 'Consistency', 'Isolation', 'Durability', 'A', 2.0),
('DBMS', 'Database Management Systems', 'A relational table is in 2nd Normal Form (2NF) if it is in 1NF and contains no:', 'Transitive dependency', 'Partial functional dependency on composite candidate key', 'Multivalued dependency', 'Join dependency', 'B', 2.0),
('DBMS', 'Database Management Systems', 'Which relational algebra operator returns rows present in the first relation but absent in the second relation?', 'Cartesian Product', 'Set Difference (-)', 'Intersection', 'Natural Join', 'B', 2.0),
('DBMS', 'Database Management Systems', 'In SQL, which clause is strictly required to filter rows based on aggregate function outputs (e.g. COUNT > 5)?', 'WHERE', 'HAVING', 'GROUP BY', 'ORDER BY', 'B', 2.0),
('DBMS', 'Database Management Systems', 'Which database key uniquely identifies each record in a relation and strictly prohibits NULL values?', 'Foreign Key', 'Primary Key', 'Candidate Key with NULLs', 'Alternate Key', 'B', 2.0);

-- 4. Insert Initial Scoreboard Results (IIIT Kota 10-Point Scale)
INSERT INTO `results` (`roll_no`, `subject`, `score`, `total_marks`, `percentage`, `grade`, `grade_point`) VALUES
('21CS101', 'Web Development', 10, 10, 100.00, 'A+ (10 Pts)', 10),
('21CS101', 'Data Structures & Algorithms', 8, 10, 80.00, 'A (9 Pts)', 9),
('21CS102', 'Web Development', 8, 10, 80.00, 'A (9 Pts)', 9),
('21CS102', 'Data Structures & Algorithms', 7, 10, 70.00, 'B+ (8 Pts)', 8);
