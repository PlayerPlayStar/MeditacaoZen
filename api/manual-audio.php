<?php
header('Content-Type: application/json');

$category = $_GET['category'] ?? '';

if (empty($category)) {
    echo json_encode(['success' => false, 'message' => 'Categoria não especificada']);
    exit;
}

//verifies categories for audio files
$allowedCategories = ['noite', 'calmaria', 'por do sol'];
if (!in_array($category, $allowedCategories, true)) {
    echo json_encode(['success' => false, 'message' => 'Categoria inválida']);
    exit;
}

$folderMapping = [
    'noite' => 'Noite',
    'calmaria' => 'Calmaria',
    'por do sol' => 'Por do Sol'
];
$resolvedFolder = $folderMapping[$category];


$manualDir = __DIR__ . '/../assets/audio/manual/' . $resolvedFolder . '/';
$audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'mp4'];


if (!is_dir($manualDir)) {
    echo json_encode(['success' => false, 'message' => 'Diretório não encontrado']);
    exit;
}

$files = [];
$dir = opendir($manualDir);

while (($file = readdir($dir)) !== false) {
    if ($file === '.' || $file === '..') continue;
    
    $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if (in_array($extension, $audioExtensions)) {
        $filePath = $manualDir . $file;
        $files[] = [
            'name' => $file,
            'path' => '/assets/audio/manual/' . $resolvedFolder . '/' . $file,
            'size' => filesize($filePath),
            'extension' => $extension
        ];
    }
}

closedir($dir);

usort($files, function($a, $b) {
    return strcmp($a['name'], $b['name']);
});


echo json_encode([
    'success' => true,
    'files' => $files,
    'category' => $category,
    'folder' => $resolvedFolder,
    'count' => count($files)
]);
?>

