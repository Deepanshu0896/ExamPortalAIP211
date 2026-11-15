<?php
/**
 * ONLINE EXAM SYSTEM - SUBJECTS REGISTRY API (get_subjects.php)
 * Delivers real-time subject inventory, paper access lock states, and question counts from MySQL.
 * Accessible to all portal visitors (students, admins, guests).
 */

session_start();
header('Content-Type: application/json; charset=UTF-8');
require_once 'db_connect.php';

$subjects = [];

if ($conn) {
    $sql = "SELECT s.id, s.code, s.course_code, s.name, s.description, s.status, 
                   s.total_marks, s.num_questions, s.duration_mins,
                   COUNT(q.id) as question_count 
            FROM subjects s 
            LEFT JOIN questions q ON s.code = q.subject_code 
            GROUP BY s.id, s.code, s.course_code, s.name, s.description, s.status, s.total_marks, s.num_questions, s.duration_mins
            ORDER BY s.id ASC";
            
    $res = mysqli_query($conn, $sql);
    if ($res) {
        while ($row = mysqli_fetch_assoc($res)) {
            $subjects[] = [
                'id'            => (int)$row['id'],
                'code'          => $row['code'],
                'course_code'   => !empty($row['course_code']) ? $row['course_code'] : $row['code'],
                'name'          => $row['name'],
                'description'   => $row['description'],
                'status'        => $row['status'], // 'active' or 'locked'
                'total_marks'   => (int)($row['total_marks'] ? $row['total_marks'] : 10),
                'num_questions' => (int)($row['num_questions'] ? $row['num_questions'] : 5),
                'duration_mins' => (int)($row['duration_mins'] ? $row['duration_mins'] : 10),
                'question_count'=> (int)$row['question_count']
            ];
        }
    }
}

echo json_encode([
    'status'   => $conn ? 'success' : 'offline',
    'count'    => count($subjects),
    'subjects' => $subjects
]);

