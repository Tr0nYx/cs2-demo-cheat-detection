<?php

declare(strict_types=1);

namespace App\Domain\Analysis;

enum SuspicionLabel: string
{
    case Clean = 'clean';
    case Suspicious = 'suspicious';
    case LikelyCheating = 'likely_cheating';
}
