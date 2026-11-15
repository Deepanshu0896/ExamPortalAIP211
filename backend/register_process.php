<?php
/**
 * ONLINE EXAM SYSTEM - REGISTRATION HANDLER (register_process.php)
 * Processes POST submission from frontend/register.html
 */

require_once 'db_connect.php';

// Check if request was submitted via HTTP POST method
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    // Sanitize user inputs to prevent basic SQL injection
    $name     = mysqli_real_escape_string($conn, trim($_POST['name']));
    $roll_no  = mysqli_real_escape_string($conn, trim($_POST['roll_no']));
    $email    = mysqli_real_escape_string($conn, trim($_POST['email']));
    $branch   = mysqli_real_escape_string($conn, trim($_POST['branch']));
    $password = mysqli_real_escape_string($conn, trim($_POST['password']));

    // Check if Roll Number or Email already exists
    $check_query = "SELECT id FROM users WHERE roll_no = '$roll_no' OR email = '$email' LIMIT 1";
    $check_result = mysqli_query($conn, $check_query);

    if (mysqli_num_rows($check_result) > 0) {
        echo "<script>
                alert('⚠️ Roll Number or Email is already registered! Please login.');
                window.location.href = '../frontend/login.html';
              </script>";
        exit();
    }

    // Insert new student into `users` table
    $insert_sql = "INSERT INTO users (name, roll_no, email, branch, password, role) 
                   VALUES ('$name', '$roll_no', '$email', '$branch', '$password', 'student')";

    if (mysqli_query($conn, $insert_sql)) {
        echo "<script>
                alert('✅ Registration successful! Please log in with your Roll Number.');
                window.location.href = '../frontend/login.html';
              </script>";
        exit();
    } else {
        echo "Error: " . mysqli_error($conn);
    }

} else {
    // If accessed directly without POST
    header("Location: ../frontend/register.html");
    exit();
}
?>

