<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260516042700 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add model_version column to analysis_result table (Phase 7 enhancement)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE analysis_result ADD COLUMN IF NOT EXISTS model_version VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE analysis_result DROP COLUMN IF EXISTS model_version');
    }
}
