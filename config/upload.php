<?php
ini_set('upload_max_filesize', '50M');
ini_set('post_max_size', '50M');
ini_set('max_execution_time', 300);
ini_set('max_input_time', 300);
ini_set('memory_limit', '256M');

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// check upload configuration
function checkUploadConfig() {
    $config = [
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'post_max_size' => ini_get('post_max_size'),
        'max_file_uploads' => ini_get('max_file_uploads'),
        'file_uploads' => ini_get('file_uploads'),
        'max_execution_time' => ini_get('max_execution_time'),
        'memory_limit' => ini_get('memory_limit')
    ];
    
    return $config;
}

function parseSize($size) {
    $unit = preg_replace('/[^bkmgtpezy]/i', '', $size);
    $size = preg_replace('/[^0-9\.]/', '', $size);
    if ($unit) {
        return round($size * pow(1024, stripos('bkmgtpezy', $unit[0])));
    } else {
        return round($size);
    }
}

function validateUploadConfig() {
    $config = checkUploadConfig();
    $maxUpload = parseSize($config['upload_max_filesize']);
    $maxPost = parseSize($config['post_max_size']);
    
    $issues = [];
    
    if ($maxUpload < 50 * 1024 * 1024) {
        $issues[] = "upload_max_filesize muito baixo: {$config['upload_max_filesize']}";
    }
    
    if ($maxPost < 50 * 1024 * 1024) {
        $issues[] = "post_max_size muito baixo: {$config['post_max_size']}";
    }
    
    if (!$config['file_uploads']) {
        $issues[] = "file_uploads está desabilitado";
    }
    
    return [
        'valid' => empty($issues),
        'issues' => $issues,
        'config' => $config
    ];
}
?>

