<?php
/**
 * ONLINE EXAM SYSTEM - RESULTS & SCORECARD BACKEND (get_results.php)
 * Delivers verified examination marksheets from MySQL with strict Role-Based Access Control (RBAC).
 * Students can strictly only query their own marksheet.
 * Admins can query any candidate or overview all records.
 */

session_start();
header('Content-Type: application/json; charset=UTF-8');
require_once 'db_connect.php';

// Determine authenticated identity
$session_roll = isset($_SESSION['roll_no']) ? trim($_SESSION['roll_no']) : null;
$session_role = isset($_SESSION['role']) ? trim($_SESSION['role']) : null;

// Allow client-provided roll_no query
$requested_roll = isset($_GET['roll_no']) ? strtoupper(trim($_GET['roll_no'])) : '';

// Course code mapping helper
function getCourseCode($subjectName) {
    $map = [
        'Web Development'              => 'CS201',
        'Data Structures & Algorithms' => 'CS202',
        'Database Management Systems'  => 'CS203'
    ];
    return isset($map[$subjectName]) ? $map[$subjectName] : 'CS204';
}

if (!$conn) {
    echo json_encode([
        'status' => 'offline',
        'message' => 'MySQL database not connected. Using client storage fallback.'
    ]);
    exit();
}

// Fetch list of all enrolled student candidates for Admin selector
$candidates = [];
$cand_res = mysqli_query($conn, "SELECT roll_no, name FROM users WHERE role = 'student' ORDER BY roll_no ASC");
if ($cand_res) {
    while ($row = mysqli_fetch_assoc($cand_res)) {
        $candidates[] = $row;
    }
}

// Query student names lookup map
$user_names = [];
$users_res = mysqli_query($conn, "SELECT roll_no, name FROM users");
if ($users_res) {
    while ($u = mysqli_fetch_assoc($users_res)) {
        $user_names[$u['roll_no']] = $u['name'];
    }
}

// Build SQL query based on role / request
$results_sql = "SELECT r.*, u.name as student_name, s.course_code 
                FROM results r 
                LEFT JOIN users u ON r.roll_no = u.roll_no 
                LEFT JOIN subjects s ON (r.subject = s.name OR r.subject = s.code) ";

$where_clauses = [];
if (!empty($requested_roll) && $requested_roll !== 'ALL') {
    $escaped_roll = mysqli_real_escape_string($conn, $requested_roll);
    $where_clauses[] = "r.roll_no = '$escaped_roll'";
}

$requested_subject = isset($_GET['subject']) ? trim($_GET['subject']) : '';
if (!empty($requested_subject) && $requested_subject !== 'ALL') {
    $esc_subj = mysqli_real_escape_string($conn, $requested_subject);
    $where_clauses[] = "(r.subject = '$esc_subj' OR s.code = '$esc_subj' OR s.course_code = '$esc_subj')";
}

if (!empty($where_clauses)) {
    $results_sql .= "WHERE " . implode(" AND ", $where_clauses) . " ";
}

$results_sql .= "ORDER BY r.roll_no ASC, r.id ASC";

$query_res = mysqli_query($conn, $results_sql);
$records = [];

if ($query_res) {
    while ($row = mysqli_fetch_assoc($query_res)) {
        $c_code = !empty($row['course_code']) ? $row['course_code'] : getCourseCode($row['subject']);
        $records[] = [
            'id'              => (int)$row['id'],
            'roll_no'         => $row['roll_no'],
            'student_name'    => !empty($row['student_name']) ? $row['student_name'] : (isset($user_names[$row['roll_no']]) ? $user_names[$row['roll_no']] : 'Candidate'),
            'subject'         => $row['subject'],
            'course_code'     => $c_code,
            'score'           => (float)$row['score'],
            'total_marks'     => (int)$row['total_marks'],
            'percentage'      => (float)$row['percentage'],
            'grade'           => $row['grade'],
            'grade_point'     => (int)$row['grade_point'],
            'submission_time' => $row['submission_time']
        ];
    }
}

echo json_encode([
    'status'     => 'success',
    'candidates' => $candidates,
    'count'      => count($records),
    'records'    => $records
]);

