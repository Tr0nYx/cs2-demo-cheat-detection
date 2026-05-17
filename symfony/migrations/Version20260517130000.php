<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260517130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create persisted demo viewer round, event, and heatmap metadata tables (Phase 13 Wave 2)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE IF NOT EXISTS demo_round (id UUID NOT NULL, demo_id UUID NOT NULL, round_number INT NOT NULL, start_tick INT NOT NULL, end_tick INT NOT NULL, winner VARCHAR(8) DEFAULT NULL, end_reason VARCHAR(64) DEFAULT NULL, duration_ms INT NOT NULL, kills INT NOT NULL, first_kill_tick INT DEFAULT NULL, bomb_planted BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_demo_round_demo_round ON demo_round (demo_id, round_number)');
        $this->addSql('ALTER TABLE demo_round ADD CONSTRAINT fk_demo_round_demo FOREIGN KEY (demo_id) REFERENCES demo (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('CREATE TABLE IF NOT EXISTS demo_grenade (id UUID NOT NULL, demo_id UUID NOT NULL, round_number INT NOT NULL, tick INT NOT NULL, time_ms INT NOT NULL, thrower_steam_id VARCHAR(32) NOT NULL, thrower_name VARCHAR(255) DEFAULT NULL, grenade_type VARCHAR(32) NOT NULL, start_x DOUBLE PRECISION NOT NULL, start_y DOUBLE PRECISION NOT NULL, start_z DOUBLE PRECISION NOT NULL, end_x DOUBLE PRECISION DEFAULT NULL, end_y DOUBLE PRECISION DEFAULT NULL, end_z DOUBLE PRECISION DEFAULT NULL, end_map_px INT DEFAULT NULL, end_map_py INT DEFAULT NULL, trajectory JSON NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_demo_grenade_demo_round ON demo_grenade (demo_id, round_number)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_demo_grenade_demo_tick ON demo_grenade (demo_id, tick)');
        $this->addSql('ALTER TABLE demo_grenade ADD CONSTRAINT fk_demo_grenade_demo FOREIGN KEY (demo_id) REFERENCES demo (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('CREATE TABLE IF NOT EXISTS demo_suspicious_kill (id UUID NOT NULL, demo_id UUID NOT NULL, round_number INT NOT NULL, tick INT NOT NULL, attacker_steam_id VARCHAR(32) NOT NULL, victim_steam_id VARCHAR(32) NOT NULL, attacker_name VARCHAR(255) DEFAULT NULL, victim_name VARCHAR(255) DEFAULT NULL, weapon VARCHAR(64) DEFAULT NULL, attacker_x DOUBLE PRECISION DEFAULT NULL, attacker_y DOUBLE PRECISION DEFAULT NULL, attacker_z DOUBLE PRECISION DEFAULT NULL, victim_x DOUBLE PRECISION DEFAULT NULL, victim_y DOUBLE PRECISION DEFAULT NULL, victim_z DOUBLE PRECISION DEFAULT NULL, headshot BOOLEAN NOT NULL, aimbot_score DOUBLE PRECISION NOT NULL, snap_ratio DOUBLE PRECISION NOT NULL, reaction_ms INT DEFAULT NULL, flag_reasons JSON NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_demo_suspicious_kill_demo_round ON demo_suspicious_kill (demo_id, round_number)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_demo_suspicious_kill_demo_tick ON demo_suspicious_kill (demo_id, tick)');
        $this->addSql('ALTER TABLE demo_suspicious_kill ADD CONSTRAINT fk_demo_suspicious_kill_demo FOREIGN KEY (demo_id) REFERENCES demo (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('CREATE TABLE IF NOT EXISTS demo_heatmap (id UUID NOT NULL, demo_id UUID NOT NULL, player_steam_id VARCHAR(32) DEFAULT NULL, heatmap_type VARCHAR(32) NOT NULL, round_from INT DEFAULT NULL, round_to INT DEFAULT NULL, file_path VARCHAR(1024) NOT NULL, file_size_bytes INT NOT NULL, metadata JSON NOT NULL, generated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX IF NOT EXISTS uniq_demo_heatmap_lookup ON demo_heatmap (demo_id, player_steam_id, heatmap_type, round_from, round_to)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_demo_heatmap_demo_type ON demo_heatmap (demo_id, heatmap_type)');
        $this->addSql('ALTER TABLE demo_heatmap ADD CONSTRAINT fk_demo_heatmap_demo FOREIGN KEY (demo_id) REFERENCES demo (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE demo_heatmap DROP CONSTRAINT IF EXISTS fk_demo_heatmap_demo');
        $this->addSql('ALTER TABLE demo_suspicious_kill DROP CONSTRAINT IF EXISTS fk_demo_suspicious_kill_demo');
        $this->addSql('ALTER TABLE demo_grenade DROP CONSTRAINT IF EXISTS fk_demo_grenade_demo');
        $this->addSql('ALTER TABLE demo_round DROP CONSTRAINT IF EXISTS fk_demo_round_demo');
        $this->addSql('DROP TABLE IF EXISTS demo_heatmap');
        $this->addSql('DROP TABLE IF EXISTS demo_suspicious_kill');
        $this->addSql('DROP TABLE IF EXISTS demo_grenade');
        $this->addSql('DROP TABLE IF EXISTS demo_round');
    }
}
