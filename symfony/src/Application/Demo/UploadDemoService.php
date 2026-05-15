<?php

declare(strict_types=1);

namespace App\Application\Demo;

use App\Domain\Demo\Demo;
use App\Domain\Demo\DemoStorage;
use App\Infrastructure\Persistence\DemoRepository;
use App\UI\Api\ApiProblem;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Uid\Uuid;
use App\Application\Command\AnalyzeDemoMessage;

final readonly class UploadDemoService
{
    public function __construct(
        private DemoStorage $storage,
        private DemoRepository $demos,
        private MessageBusInterface $messageBus,
        #[Autowire(param: 'max_demo_upload_size')]
        private int $maxUploadSize,
    ) {
    }

    public function upload(UploadDemoRequest $request): Demo
    {
        $file = $request->file;

        if (!$file->isValid()) {
            throw ApiProblem::badRequest('invalid_upload', 'The uploaded demo file could not be read.');
        }

        $extension = strtolower($file->getClientOriginalExtension());
        if ($extension !== 'dem') {
            throw ApiProblem::badRequest('invalid_extension', 'Only .dem files are accepted.', ['extension' => $extension]);
        }

        $size = $file->getSize();
        if ($size !== null && $size > $this->maxUploadSize) {
            throw ApiProblem::badRequest('upload_too_large', 'The uploaded demo file exceeds the configured maximum size.', ['max_bytes' => $this->maxUploadSize]);
        }

        $demoId = Uuid::v7();
        $storedFile = null;
        $demo = null;

        try {
            $storedFile = $this->storage->store($demoId, $file);
            $demo = new Demo(
                filePath: $storedFile->path,
                storageDisk: $storedFile->disk,
                originalFilename: $file->getClientOriginalName(),
                steamMatchId: $request->steamMatchId,
                id: $demoId,
            );
            $this->demos->save($demo);
            $this->messageBus->dispatch(new AnalyzeDemoMessage($demo->getIdString()));

            return $demo;
        } catch (ApiProblem $problem) {
            throw $problem;
        } catch (FileException $exception) {
            if ($storedFile !== null) {
                $this->storage->delete($storedFile->path);
            }

            throw ApiProblem::serverError('storage_failed', 'The demo could not be stored.');
        } catch (\Throwable $exception) {
            if ($storedFile !== null) {
                $this->storage->delete($storedFile->path);
            }
            if ($demo !== null) {
                $this->demos->remove($demo);
            }

            throw ApiProblem::serverError('upload_failed', 'The demo could not be accepted.');
        }
    }
}
