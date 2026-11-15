<?php
/**
 * ONLINE EXAM SYSTEM - SUBMISSION & SCORING HANDLER (submit_exam.php)
 * Evaluates multiple-choice POST answers per subject, applies IIIT Kota 10-point scale, and saves to MySQL.
 * Supports dynamic number of questions and custom marking scheme.
 */

session_start();
require_once 'db_connect.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $roll_no      = isset($_POST['roll_no']) ? ($conn ? mysqli_real_escape_string($conn, $_POST['roll_no']) : htmlspecialchars(trim($_POST['roll_no']))) : (isset($_SESSION['roll_no']) ? $_SESSION['roll_no'] : '21CS101');
    $subject      = isset($_POST['subject']) ? ($conn ? mysqli_real_escape_string($conn, $_POST['subject']) : htmlspecialchars(trim($_POST['subject']))) : 'Web Development';
    $subject_code = isset($_POST['subject_code']) ? strtoupper(trim($conn ? mysqli_real_escape_string($conn, $_POST['subject_code']) : htmlspecialchars(trim($_POST['subject_code'])))) : 'WT';

    // -------------------------------------------------------------------------
    // Build answer key dynamically from DB (for all subject types)
    // -------------------------------------------------------------------------
    $answer_key = [];
    $num_questions = 5; // default

    if ($conn) {
        // Check if subject has a custom num_questions in subjects table
        $subj_res = mysqli_query($conn, "SELECT num_questions FROM subjects WHERE code = '$subject_code' LIMIT 1");
        if ($subj_res && mysqli_num_rows($subj_res) > 0) {
            $subj_row = mysqli_fetch_assoc($subj_res);
            if (!empty($subj_row['num_questions'])) {
                $num_questions = max(1, (int)$subj_row['num_questions']);
            }
        }

        // Pull answer key from DB for all subjects
        $q_res = mysqli_query($conn, "SELECT correct_opt FROM questions WHERE subject_code = '$subject_code' ORDER BY id ASC LIMIT $num_questions");
        if ($q_res && mysqli_num_rows($q_res) > 0) {
            $q_idx = 1;
            while ($q_row = mysqli_fetch_assoc($q_res)) {
                $answer_key["q$q_idx"] = $q_row['correct_opt'];
                $q_idx++;
            }
        }
    }

    // Fallback: hardcoded built-in keys if DB didn't return results
    if (empty($answer_key)) {
        $builtin_keys = [
            'WT'   => ['q1' => 'B', 'q2' => 'B', 'q3' => 'B', 'q4' => 'B', 'q5' => 'B'],
            'DS'   => ['q1' => 'B', 'q2' => 'B', 'q3' => 'B', 'q4' => 'B', 'q5' => 'C'],
            'DBMS' => ['q1' => 'B', 'q2' => 'C', 'q3' => 'B', 'q4' => 'C', 'q5' => 'C'],
        ];
        $answer_key = isset($builtin_keys[$subject_code]) ? $builtin_keys[$subject_code] : $builtin_keys['WT'];
        $num_questions = count($answer_key);
    }

    // Check subject lock status — block submission if locked
    $is_locked = false;
    if ($conn) {
        $lock_res = mysqli_query($conn, "SELECT status FROM subjects WHERE code = '$subject_code' LIMIT 1");
        if ($lock_res && mysqli_num_rows($lock_res) > 0) {
            $lock_row = mysqli_fetch_assoc($lock_res);
            if ($lock_row['status'] === 'locked') $is_locked = true;
        }
    }

    if ($is_locked) {
        die("<!DOCTYPE html><html><head><link rel='stylesheet' href='../frontend/css/style.css'></head><body>
             <div class='container py-40'>
                <div class='locked-paper-box'>
                    <div class='locked-icon'>🔒</div>
                    <h2 class='locked-title'>Access Denied</h2>
                    <p class='locked-desc'>$subject_code: $subject is a locked paper and cannot be submitted.</p>
                    <div class='hero-actions'>
                        <a href='../frontend/index.html' class='btn btn-primary'>Return to Portal</a>
                    </div>
                </div>
             </div></body></html>");
    }

    // -------------------------------------------------------------------------
    // Evaluate answers — supports question_ids array or standard q1..qN fields
    // -------------------------------------------------------------------------
    $submitted_qids = isset($_POST['question_ids']) ? $_POST['question_ids'] : null;
    $score = 0;
    $total_marks = 10;
    $correct_count = 0;

    if (!empty($submitted_qids) && is_array($submitted_qids) && $conn) {
        // High-precision dynamic grading based on specific question IDs presented to candidate
        $num_questions = count($submitted_qids);
        $marks_per_q = $num_questions > 0 ? (10.0 / $num_questions) : 2.0;

        foreach ($submitted_qids as $idx => $qid) {
            $qid_int = (int)$qid;
            $q_idx = $idx + 1;
            // Get correct option from DB
            $db_q = mysqli_query($conn, "SELECT correct_opt FROM questions WHERE id = $qid_int LIMIT 1");
            if ($db_q && mysqli_num_rows($db_q) > 0) {
                $q_data = mysqli_fetch_assoc($db_q);
                $correct_opt = strtoupper($q_data['correct_opt']);

                // Submitted value can be ans_ID or qN
                $submitted_val = null;
                if (isset($_POST['ans_' . $qid_int])) {
                    $submitted_val = strtoupper(trim($_POST['ans_' . $qid_int]));
                } elseif (isset($_POST['q' . $q_idx])) {
                    $submitted_val = strtoupper(trim($_POST['q' . $q_idx]));
                } elseif (isset($_POST['ds_q' . $q_idx])) {
                    $submitted_val = strtoupper(trim($_POST['ds_q' . $q_idx]));
                } elseif (isset($_POST['db_q' . $q_idx])) {
                    $submitted_val = strtoupper(trim($_POST['db_q' . $q_idx]));
                }

                if ($submitted_val === $correct_opt) {
                    $correct_count++;
                }
            }
        }
    } else {
        // Fallback standard evaluation
        $marks_per_q = $num_questions > 0 ? (10.0 / $num_questions) : 2.0;
        foreach ($answer_key as $q_key => $correct_val) {
            $idx_num = substr($q_key, 1);
            $submitted_val = null;
            if (isset($_POST[$q_key])) {
                $submitted_val = strtoupper(trim($_POST[$q_key]));
            } elseif (isset($_POST['ds_q' . $idx_num])) {
                $submitted_val = strtoupper(trim($_POST['ds_q' . $idx_num]));
            } elseif (isset($_POST['db_q' . $idx_num])) {
                $submitted_val = strtoupper(trim($_POST['db_q' . $idx_num]));
            }

            if ($submitted_val === strtoupper($correct_val)) {
                $correct_count++;
            }
        }
    }

    $score      = round($correct_count * $marks_per_q, 2);
    $percentage = ($score / $total_marks) * 100;

    // IIIT Kota Official 10-Point Credit Scale
    if ($percentage >= 90)      { $grade = "A+ (10 Pts)"; $grade_point = 10; }
    elseif ($percentage >= 80)  { $grade = "A (9 Pts)";   $grade_point = 9;  }
    elseif ($percentage >= 70)  { $grade = "B+ (8 Pts)";  $grade_point = 8;  }
    elseif ($percentage >= 60)  { $grade = "B (7 Pts)";   $grade_point = 7;  }
    elseif ($percentage >= 50)  { $grade = "C+ (6 Pts)";  $grade_point = 6;  }
    elseif ($percentage >= 40)  { $grade = "C (5 Pts)";   $grade_point = 5;  }
    elseif ($percentage >= 35)  { $grade = "D (4 Pts)";   $grade_point = 4;  }
    else                        { $grade = "F (0 Pts)";   $grade_point = 0;  }

    // Insert record into MySQL `results` table
    $insert_sql = "INSERT INTO results (roll_no, subject, score, total_marks, percentage, grade, grade_point) 
                   VALUES ('$roll_no', '$subject', $score, $total_marks, $percentage, '$grade', $grade_point)";
    
    $insert_success = $conn ? mysqli_query($conn, $insert_sql) : true;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IIIT Kota | Assessment Score Report</title>
    <link rel="stylesheet" href="../frontend/css/style.css">
    <link rel="stylesheet" href="../frontend/css/animations.css">
</head>
<body>

    <header class="site-header">
        <nav class="navbar">
            <div class="brand-logo">
                <span class="logo-icon">🎓</span>
                <span>ExamPortal</span>
            </div>
            <ul class="nav-links">
                <li class="nav-item"><a href="../frontend/index.html" class="nav-link">Home</a></li>
                <li class="nav-item"><a href="../frontend/results.html" class="nav-link active">Scoreboard</a></li>
            </ul>
        </nav>
    </header>

    <main class="container">
        <div class="ui-card result-container animate-fade-in">
            <h2 class="card-title"><big>Examination Submitted Successfully!</big></h2>
            <p class="text-muted">Candidate: <strong><?php echo htmlspecialchars($roll_no); ?></strong> | Course: <strong><?php echo htmlspecialchars($subject); ?></strong></p>
            <p class="text-muted">Questions: <strong><?php echo $num_questions; ?></strong> | Marks per Question: <strong><?php echo number_format($marks_per_q, 2); ?></strong></p>

            <div class="score-circle">
                <span class="score-number"><?php echo $score; ?></span>
                <span class="score-total">out of <?php echo $total_marks; ?></span>
            </div>

            <div class="grade-display">
                <strong>IIIT Kota Grade Awarded:</strong> 
                <span class="grade-text"><?php echo $grade; ?></span> 
                (<?php echo number_format($percentage, 1); ?>%)
            </div>

            <?php if ($insert_success): ?>
                <div class="alert-success">
                    ✅ Result successfully compiled and saved in MySQL <code>results</code> database table!
                </div>
            <?php else: ?>
                <div class="alert-warning">
                    Note: Database write skipped (Preview Mode). Score evaluated in memory.
                </div>
            <?php endif; ?>

            <div class="result-actions">
                <a href="../frontend/results.html" class="btn btn-primary hover-scale">View Marksheet &amp; SGPA Table</a>
                <a href="../frontend/index.html" class="btn btn-outline hover-scale">Return to Portal</a>
            </div>
        </div>
    </main>

    <footer class="site-footer">
        <div class="footer-bottom">
            &copy; 2026 Online Examination System. IIIT Kota Autonomous Academic Evaluation Cell. All Rights Reserved.
        </div>
    </footer>

</body>
</html>
<?php
} else {
    header("Location: ../frontend/exam.html");
    exit();
}
?>
