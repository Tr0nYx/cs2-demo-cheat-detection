<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260517193000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add demo outcome and filter indexes for phase 15 analytics scoping';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE demo ADD COLUMN IF NOT EXISTS outcome VARCHAR(16) DEFAULT NULL');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_demo_map ON demo (map)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_demo_outcome ON demo (outcome)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_demo_outcome');
        $this->addSql('DROP INDEX IF EXISTS idx_demo_map');
        $this->addSql('ALTER TABLE demo DROP COLUMN IF EXISTS outcome');
    }
}
