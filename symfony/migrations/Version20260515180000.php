<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260515180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add model_version column to analysis_result table for model traceability';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE analysis_result ADD model_version VARCHAR(255) DEFAULT NULL');
        $this->addSql('CREATE INDEX idx_analysis_result_model_version ON analysis_result (model_version)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_analysis_result_model_version');
        $this->addSql('ALTER TABLE analysis_result DROP model_version');
    }
}
