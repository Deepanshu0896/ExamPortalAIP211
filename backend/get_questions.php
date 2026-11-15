<?php
/**
 * ONLINE EXAM SYSTEM - QUESTION BANK API (get_questions.php)
 * Delivers multiple-choice examination questions per subject from MySQL database.
 * Used by Exam Lobby and Question Bank Viewer.
 */

session_start();
header('Content-Type: application/json; charset=UTF-8');
require_once 'db_connect.php';

$subject_code = isset($_GET['subject']) ? strtoupper(trim($_GET['subject'])) : '';

$questions = [];

if ($conn) {
    $where = "";
    if (!empty($subject_code) && $subject_code !== 'ALL') {
        $esc_subj = mysqli_real_escape_string($conn, $subject_code);
        $where = "WHERE subject_code = '$esc_subj'";
    }

    $sql = "SELECT id, subject_code, subject_name, question_text, opt_a, opt_b, opt_c, opt_d, correct_opt, marks 
            FROM questions $where 
            ORDER BY id ASC";
            
    $res = mysqli_query($conn, $sql);
    if ($res) {
        while ($row = mysqli_fetch_assoc($res)) {
            $questions[] = [
                'id'            => (int)$row['id'],
                'subject_code'  => $row['subject_code'],
                'subject_name'  => $row['subject_name'],
                'question_text' => $row['question_text'],
                'opt_a'         => $row['opt_a'],
                'opt_b'         => $row['opt_b'],
                'opt_c'         => $row['opt_c'],
                'opt_d'         => $row['opt_d'],
                'correct_opt'   => $row['correct_opt'],
                'marks'         => (float)$row['marks']
            ];
        }
    }
}

echo json_encode([
    'status'    => $conn ? 'success' : 'offline',
    'count'     => count($questions),
    'questions' => $questions
]);

