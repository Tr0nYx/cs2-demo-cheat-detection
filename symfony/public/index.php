<?php

declare(strict_types=1);

header('Content-Type: application/json');

echo json_encode([
    'service' => 'CS2 Demo Cheat Detection',
    'status' => 'container-foundation-ready',
    'note' => 'Symfony will replace this bootstrap in Phase 2.',
], JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT);
