<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260515175400 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create recoil_patterns table for ML-learned weapon patterns with versioning';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE recoil_patterns (id UUID NOT NULL, weapon_name VARCHAR(100) NOT NULL, pattern_version VARCHAR(100) NOT NULL, dataset_version VARCHAR(100) NOT NULL, quantiles_json JSON NOT NULL, bounds_json JSON NOT NULL, percentile_90 DOUBLE PRECISION NOT NULL, is_active BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_recoil_patterns_weapon_version ON recoil_patterns (weapon_name, pattern_version, dataset_version)');
        $this->addSql('CREATE INDEX idx_recoil_patterns_weapon_active ON recoil_patterns (weapon_name, is_active)');
        $this->addSql('CREATE INDEX idx_recoil_patterns_created_at ON recoil_patterns (created_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE recoil_patterns');
    }
}
