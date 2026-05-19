<?php

require 'vendor/autoload.php';

use App\Kernel;
use App\Application\Demo\HltvImportMessage;

$kernel = new Kernel('dev', true);
$kernel->boot();

$bus = $kernel->getContainer()->get('messenger.default_bus');
$bus->dispatch(new HltvImportMessage('https://www.hltv.org/matches/2372223/faze-vs-astralis-iem-dallas-2024'));

echo "Match dispatched to queue!\n";
