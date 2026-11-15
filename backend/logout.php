<?php
/**
 * ONLINE EXAM SYSTEM - LOGOUT SCRIPT (logout.php)
 * Clears student session variables, removes client storage, and redirects to home portal.
 */

session_start();
$_SESSION = array();

if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

session_destroy();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Logging Out...</title>
</head>
<body>
    <script>
        localStorage.removeItem('examUser');
        sessionStorage.removeItem('examUser');
        sessionStorage.removeItem('lastExamResult');
        window.location.href = '../frontend/index.html';
    </script>
</body>
</html>
