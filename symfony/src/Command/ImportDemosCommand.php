<?php

declare(strict_types=1);

namespace App\Command;

use App\Application\Demo\UploadDemoRequest;
use App\Application\Demo\UploadDemoService;
use App\Infrastructure\Persistence\DemoRepository;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\HttpFoundation\File\UploadedFile;

#[AsCommand(
    name: 'app:demo:import',
    description: 'Import local CS2 .dem files from the tasks/demo folder',
)]
final class ImportDemosCommand extends Command
{
    public function __construct(
        private readonly UploadDemoService $uploadDemoService,
        private readonly DemoRepository $demoRepository,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $demoDir = '/var/www/html/tasks/demo';

        if (!is_dir($demoDir)) {
            $io->error(sprintf('Directory not found: %s', $demoDir));
            return Command::FAILURE;
        }

        $io->title('CS2 Demo Local Importer');
        $io->text(sprintf('Scanning directory: %s', $demoDir));

        $files = glob($demoDir . '/*.dem');

        if (empty($files)) {
            $io->warning('No CS2 .dem files found in tasks/demo.');
            return Command::SUCCESS;
        }

        $io->text(sprintf('Found %d demo files. Starting ingestion...', count($files)));

        $successCount = 0;
        $skipCount = 0;
        $failCount = 0;

        foreach ($files as $filePath) {
            $filename = basename($filePath);
            $io->section(sprintf('Processing file: %s', $filename));

            // Check if already imported
            $existing = $this->demoRepository->findOneBy(['originalFilename' => $filename]);
            if ($existing !== null) {
                $io->note(sprintf('Skipping already imported demo: %s (ID: %s)', $filename, $existing->getIdString()));
                $skipCount++;
                continue;
            }

            try {
                $io->text('Creating mock UploadedFile...');
                // Create custom mock UploadedFile with test parameter set to true
                $uploadedFile = new UploadedFile(
                    path: $filePath,
                    originalName: $filename,
                    mimeType: null,
                    error: UPLOAD_ERR_OK,
                    test: true
                );

                $io->text('Calling UploadDemoService...');
                $demo = $this->uploadDemoService->upload(new UploadDemoRequest($uploadedFile));

                $io->success(sprintf('Successfully imported: %s (ID: %s)', $filename, $demo->getIdString()));
                $successCount++;
            } catch (\Throwable $e) {
                $io->error(sprintf('Failed to import %s: %s', $filename, $e->getMessage()));
                $failCount++;
            }
        }

        $io->newLine();
        $io->title('Import Summary');
        $io->listing([
            sprintf('Successfully imported: <info>%d</info>', $successCount),
            sprintf('Skipped (already imported): <comment>%d</comment>', $skipCount),
            sprintf('Failed: <error>%d</error>', $failCount),
        ]);

        return Command::SUCCESS;
    }
}
