<?php
/**
 * ONLINE EXAM SYSTEM - ADMIN MANAGEMENT BACKEND (admin_manage.php)
 * Handles dynamic subject registration, question bank insertions, paper lock toggling, and subject deletion.
 */

session_start();
require_once 'db_connect.php';

// Check request method
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $action = isset($_POST['action']) ? mysqli_real_escape_string($conn, $_POST['action']) : '';

    // =========================================================================
    // ACTION 1: ADD NEW EXAMINATION SUBJECT
    // =========================================================================
    if ($action === 'add_subject') {
        $subject_code  = isset($_POST['subject_code']) ? trim(mysqli_real_escape_string($conn, $_POST['subject_code'])) : '';
        $subject_name  = isset($_POST['subject_name']) ? trim(mysqli_real_escape_string($conn, $_POST['subject_name'])) : '';
        $status        = isset($_POST['status']) && $_POST['status'] === 'active' ? 'active' : 'locked';
        $description   = isset($_POST['description']) ? trim(mysqli_real_escape_string($conn, $_POST['description'])) : '';
        $num_questions = isset($_POST['num_questions']) ? max(1, (int)$_POST['num_questions']) : 5;
        $course_code   = $subject_code;

        if (!empty($subject_code) && !empty($subject_name)) {
            $insert_query = "INSERT INTO subjects (code, course_code, name, description, status, num_questions) 
                             VALUES ('$subject_code', '$course_code', '$subject_name', '$description', '$status', $num_questions)
                             ON DUPLICATE KEY UPDATE name='$subject_name', status='$status', description='$description', num_questions=$num_questions";
            
            $result = mysqli_query($conn, $insert_query);
            $msg = $result ? "Subject '$subject_name' ($subject_code) registered with $num_questions questions per paper!" : "Error inserting subject: " . mysqli_error($conn);
        } else {
            $msg = "Please provide both Subject Code and Title.";
        }
    }

    // =========================================================================
    // ACTION 2: ADD NEW QUESTION TO QUESTION BANK
    // =========================================================================
    elseif ($action === 'add_question') {
        $subject_code  = isset($_POST['subject_code']) ? trim(mysqli_real_escape_string($conn, $_POST['subject_code'])) : 'WT';
        $question_text = isset($_POST['question_text']) ? trim(mysqli_real_escape_string($conn, $_POST['question_text'])) : '';
        $opt_a         = isset($_POST['opt_a']) ? trim(mysqli_real_escape_string($conn, $_POST['opt_a'])) : '';
        $opt_b         = isset($_POST['opt_b']) ? trim(mysqli_real_escape_string($conn, $_POST['opt_b'])) : '';
        $opt_c         = isset($_POST['opt_c']) ? trim(mysqli_real_escape_string($conn, $_POST['opt_c'])) : '';
        $opt_d         = isset($_POST['opt_d']) ? trim(mysqli_real_escape_string($conn, $_POST['opt_d'])) : '';
        $correct_opt   = isset($_POST['correct_opt']) ? strtoupper(trim(mysqli_real_escape_string($conn, $_POST['correct_opt']))) : 'A';

        // Subject Name Lookup
        $subject_names = [
            'WT'   => 'Web Development',
            'DS'   => 'Data Structures & Algorithms',
            'DBMS' => 'Database Management Systems'
        ];
        $subject_name = isset($subject_names[$subject_code]) ? $subject_names[$subject_code] : $subject_code;

        // Dynamic lookup from database if newly added subject exists
        if ($conn) {
            $lookup_query = "SELECT name FROM subjects WHERE code = '$subject_code' LIMIT 1";
            $lookup_res = mysqli_query($conn, $lookup_query);
            if ($lookup_res && mysqli_num_rows($lookup_res) > 0) {
                $sub_row = mysqli_fetch_assoc($lookup_res);
                $subject_name = $sub_row['name'];
            }
        }

        if (!empty($question_text) && !empty($opt_a) && !empty($opt_b)) {
            $insert_query = "INSERT INTO questions (subject_code, subject_name, question_text, opt_a, opt_b, opt_c, opt_d, correct_opt, marks)
                             VALUES ('$subject_code', '$subject_name', '$question_text', '$opt_a', '$opt_b', '$opt_c', '$opt_d', '$correct_opt', 2.0)";
            
            $result = mysqli_query($conn, $insert_query);
            $msg = $result ? "Question successfully added to $subject_name question bank!" : "Error inserting question: " . mysqli_error($conn);
        } else {
            $msg = "Please fill in all question fields.";
        }
    }

    // =========================================================================
    // ACTION 3: TOGGLE SUBJECT STATUS (ACTIVE / LOCKED)
    // =========================================================================
    elseif ($action === 'toggle_status') {
        $subject_code = isset($_POST['subject_code']) ? trim(mysqli_real_escape_string($conn, $_POST['subject_code'])) : '';
        
        if (!empty($subject_code)) {
            $check_sql = "SELECT status FROM subjects WHERE code = '$subject_code' LIMIT 1";
            $res = mysqli_query($conn, $check_sql);
            if ($res && mysqli_num_rows($res) > 0) {
                $row = mysqli_fetch_assoc($res);
                $new_status = ($row['status'] === 'active') ? 'locked' : 'active';
                mysqli_query($conn, "UPDATE subjects SET status = '$new_status' WHERE code = '$subject_code'");
                $msg = "Paper status for $subject_code updated to $new_status.";
            } else {
                // For base subjects not yet in DB, insert them
                $new_status = 'locked';
                mysqli_query($conn, "INSERT INTO subjects (code, course_code, name, status) VALUES ('$subject_code','$subject_code','$subject_code','$new_status') ON DUPLICATE KEY UPDATE status='$new_status'");
                $msg = "Subject $subject_code status set to $new_status.";
            }
        } else {
            $msg = "No subject code provided.";
        }
    }

    // =========================================================================
    // ACTION 4: DELETE SUBJECT AND ITS QUESTIONS
    // =========================================================================
    elseif ($action === 'delete_subject') {
        $subject_code = isset($_POST['subject_code']) ? trim(mysqli_real_escape_string($conn, $_POST['subject_code'])) : '';
        
        // Block deletion of base built-in subjects
        $protected = ['WT', 'DS', 'DBMS'];
        if (in_array($subject_code, $protected)) {
            $msg = "⚠️ Cannot delete built-in base subjects (WT, DS, DBMS). Use Lock/Unlock instead.";
        } elseif (!empty($subject_code)) {
            if ($conn) {
                // Delete related questions first
                mysqli_query($conn, "DELETE FROM questions WHERE subject_code = '$subject_code'");
                // Delete subject
                $del = mysqli_query($conn, "DELETE FROM subjects WHERE code = '$subject_code'");
                $msg = $del ? "Subject '$subject_code' and all its questions deleted successfully." : "Error deleting subject: " . mysqli_error($conn);
            } else {
                $msg = "Database not connected. Subject deleted from client storage only.";
            }
        } else {
            $msg = "No subject code provided.";
        }
    }

    // Success / Confirmation page
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Action Status</title>
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
                <li class="nav-item"><a href="../frontend/admin.html" class="nav-link active">Admin Panel</a></li>
                <li class="nav-item"><a href="../frontend/index.html" class="nav-link">Home Portal</a></li>
            </ul>
        </nav>
    </header>

    <main class="container">
        <div class="ui-card result-container animate-fade-in">
            <h2 class="card-title"><big>Faculty Admin Update</big></h2>
            <div class="alert-success">
                ✅ <?php echo htmlspecialchars($msg); ?>
            </div>
            <div class="result-actions">
                <a href="../frontend/admin.html" class="btn btn-primary hover-scale">Return to Admin Panel</a>
                <a href="../frontend/index.html" class="btn btn-outline hover-scale">Return to Home Portal</a>
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
    header("Location: ../frontend/admin.html");
    exit();
}
?>

