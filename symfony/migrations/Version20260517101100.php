<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260517101100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add map column to demo table for per-map leaderboard filtering (Phase 12 Wave 2)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE demo ADD COLUMN IF NOT EXISTS map VARCHAR(64) NULL');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_demo_map ON demo(map)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_demo_map');
        $this->addSql('ALTER TABLE demo DROP COLUMN IF EXISTS map');
    }
}
