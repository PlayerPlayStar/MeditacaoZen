<?php
/**
 * API para Arquivos de Áudio Manuais
 * 
 * Esse arquivo gerencia arquivos de áudio pré-instalados no sistema:
 * - Lista arquivos de áudio por categoria
 * - Suporta categorias: Calmaria, Noite, Pôr do Sol
 * - Retorna informações dos arquivos (nome, tamanho, extensão)
 * - Ordena arquivos em ordem alfabética
 */

// === HEADERS HTTP ===
// Configura header para resposta JSON
header('Content-Type: application/json');

// === VALIDAÇÃO DE PARÂMETROS ===
// Obter categoria da URL
$category = $_GET['category'] ?? '';

// Verifica se a categoria foi informada
if (empty($category)) {
    echo json_encode(['success' => false, 'message' => 'Categoria não especificada']);
    exit;
}

// === CATEGORIAS E APELIDOS (SUPORTE A NOMES NOVOS E ANTIGOS) ===
// Mapeia categorias para múltiplos apelidos, suportando renomear as pastas
$categoryAliases = [
    // Novos nomes canônicos (pastas reais) e aliases antigos para compatibilidade
    'noite' => ['noite', 'Noite', 'nature'],  // Nome canônico: noite (pasta: Noite)
    'calmaria' => ['calmaria', 'Calmaria', 'ocean'],  // Nome canônico: calmaria (pasta: Calmaria)
    'por do sol' => ['por do sol', 'Por do Sol', 'pordosol', 'por-do-sol', 'pôr-do-sol', 'rain']  // Nome canônico: por do sol (pasta: Por do Sol)
];

// Valida a categoria recebida contra todos os apelidos
$allAliases = array_merge(...array_values($categoryAliases));
if (!in_array($category, $allAliases, true)) {
    echo json_encode(['success' => false, 'message' => 'Categoria inválida']);
    exit;
}

// Resolver a pasta alvo com base na categoria recebida e nas pastas existentes
$resolvedFolder = null;
$canonicalCategory = null;
foreach ($categoryAliases as $canonical => $aliases) {
    if (in_array($category, $aliases, true)) {
        $canonicalCategory = $canonical;
        // Preferir a pasta que existir no disco (nome da pasta primeiro)
        foreach ($aliases as $aliasCandidate) {
            $candidatePath = __DIR__ . '/../assets/audio/manual/' . $aliasCandidate . '/';
            if (is_dir($candidatePath)) {
                $resolvedFolder = $aliasCandidate;
                break;
            }
        }
        // Se nenhuma pasta dos apelidos existir, usar o nome canônico
        if ($resolvedFolder === null) {
            $resolvedFolder = $canonical;
        }
        break;
    }
}

// === CONFIGURAÇÕES DE ARQUIVO ===
// Definir diretório e extensões permitidas com base na pasta resolvida
$manualDir = __DIR__ . '/../assets/audio/manual/' . $resolvedFolder . '/';
$audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'mp4'];

// === VERIFICAÇÃO DE DIRETÓRIO ===
// Verifica se o diretório existe
if (!is_dir($manualDir)) {
    echo json_encode(['success' => false, 'message' => 'Diretório não encontrado']);
    exit;
}

// === LEITURA DE ARQUIVOS ===
// Ler arquivos do diretório
$files = [];
$dir = opendir($manualDir);

// Processar arquivo no diretório
while (($file = readdir($dir)) !== false) {
    // Pular diretórios especiais
    if ($file === '.' || $file === '..') continue;
    
    // Verifica se é um arquivo de áudio válido
    $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if (in_array($extension, $audioExtensions)) {
        $filePath = $manualDir . $file;
        $files[] = [
            'name' => $file,                                                    // Nome do arquivo
            'path' => '/assets/audio/manual/' . $resolvedFolder . '/' . $file,  // Caminho do arquivo
            'size' => filesize($filePath),                                      // Tamanho em bytes
            'extension' => $extension                                           // Extensão do arquivo
        ];
    }
}

closedir($dir);

// === ORDENAÇÃO ===
// Ordena os arquivos por nome
usort($files, function($a, $b) {
    return strcmp($a['name'], $b['name']);
});

// === RESPOSTA JSON ===
// Retornar lista de arquivos em formato JSON
echo json_encode([
    'success' => true,
    'files' => $files,
    // Retornar a categoria e a pasta
    'category' => $category,
    'folder' => $resolvedFolder,
    'count' => count($files)
]);
?>

