<?php
/**
 * ONLINE EXAM SYSTEM - DATABASE CONNECTOR (db_connect.php)
 * Beginner-friendly MySQL connection using PHP's procedural mysqli.
 * Compatible with PHP 7.x, PHP 8.x (including PHP 8.1+ exception handling),
 * XAMPP Apache, and standalone VS Code PHP built-in servers.
 */

// Disable fatal exception throwing in PHP 8.1+ so we can handle connection states cleanly
if (function_exists('mysqli_report')) {
    mysqli_report(MYSQLI_REPORT_OFF);
}

// Detect live host vs local environment
$is_live = isset($_SERVER['HTTP_HOST']) && (
    strpos($_SERVER['HTTP_HOST'], 'great-site.net') !== false ||
    strpos($_SERVER['HTTP_HOST'], 'epizy.com') !== false ||
    strpos($_SERVER['HTTP_HOST'], 'infinityfree') !== false
);

if ($is_live) {
    // ═════════════════════════════════════════════════════════════════════
    // INFINITYFREE HOSTING CREDENTIALS (Live Production)
    // ═════════════════════════════════════════════════════════════════════
    $db_host = "sql109.infinityfree.com";
    $db_user = "if0_43426399";
    $db_pass = "wzWNGNAmd1SI";
    $db_name = "if0_43426399_online_exam_db";
} else {
    // ═════════════════════════════════════════════════════════════════════
    // LOCALHOST DEVELOPMENT CREDENTIALS (XAMPP / PHP server)
    // ═════════════════════════════════════════════════════════════════════
    $db_host = "localhost";
    $db_user = "root";
    $db_pass = "";
    $db_name = "online_exam_db";
}

// Establish MySQL connection safely
$conn = false;
try {
    $conn = @mysqli_connect($db_host, $db_user, $db_pass, $db_name);
} catch (Throwable $e) {
    $conn = false;
}

// If connection succeeded, enforce full 4-byte UTF-8 Unicode encoding
if ($conn) {
    mysqli_set_charset($conn, "utf8mb4");
}
?>
