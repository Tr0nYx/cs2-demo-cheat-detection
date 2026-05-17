<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260517000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create trace_rating and trace_calibration tables for TRACE persistence (Phase 9 Wave 2)';
    }

    public function up(Schema $schema): void
    {
        // Create trace_rating table
        $this->addSql('CREATE TABLE trace_rating (
            id BIGSERIAL PRIMARY KEY,
            analysis_result_id BIGINT UNIQUE NOT NULL,
            player_id VARCHAR(255) NOT NULL,
            demo_id VARCHAR(255) NOT NULL,
            calibration_version VARCHAR(50) DEFAULT \'default-v1\',
            trace_base FLOAT NOT NULL,
            trace_adjusted FLOAT NOT NULL,
            trace_normalized FLOAT NOT NULL,
            trust_multiplier FLOAT NOT NULL,
            trace_percentile FLOAT NULL,
            round_count INT NOT NULL,
            ekill FLOAT NOT NULL,
            aim FLOAT NOT NULL,
            kast FLOAT NOT NULL,
            util FLOAT NOT NULL,
            clutch FLOAT NOT NULL,
            ekill_raw FLOAT NOT NULL,
            aim_cpq FLOAT NOT NULL,
            aim_csq FLOAT NOT NULL,
            aim_ttd FLOAT NOT NULL,
            aim_scs FLOAT NOT NULL,
            kast_percentage FLOAT NOT NULL,
            clutch_attempts INT NOT NULL,
            clutch_wins INT NOT NULL,
            calculated_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
            CONSTRAINT fk_analysis_result_id FOREIGN KEY (analysis_result_id) REFERENCES analysis_result(id) ON DELETE CASCADE
        )');

        // Create indices for trace_rating
        $this->addSql('CREATE UNIQUE INDEX idx_trace_rating_analysis_result_id ON trace_rating(analysis_result_id)');
        $this->addSql('CREATE INDEX idx_trace_rating_player_calculated_at ON trace_rating(player_id, calculated_at)');
        $this->addSql('CREATE INDEX idx_trace_rating_calibration_version ON trace_rating(calibration_version)');

        // Create trace_calibration table
        $this->addSql('CREATE TABLE trace_calibration (
            id BIGSERIAL PRIMARY KEY,
            version VARCHAR(50) UNIQUE NOT NULL,
            sample_size INT NOT NULL,
            global_average FLOAT NOT NULL,
            ekill_mean FLOAT NOT NULL,
            ekill_stdev FLOAT NOT NULL,
            ekill_p50 FLOAT NOT NULL,
            ekill_p75 FLOAT NOT NULL,
            ekill_p95 FLOAT NOT NULL,
            aim_mean FLOAT NOT NULL,
            aim_stdev FLOAT NOT NULL,
            aim_p50 FLOAT NOT NULL,
            aim_p75 FLOAT NOT NULL,
            aim_p95 FLOAT NOT NULL,
            kast_mean FLOAT NOT NULL,
            kast_stdev FLOAT NOT NULL,
            kast_p50 FLOAT NOT NULL,
            kast_p75 FLOAT NOT NULL,
            kast_p95 FLOAT NOT NULL,
            util_mean FLOAT NOT NULL,
            util_stdev FLOAT NOT NULL,
            util_p50 FLOAT NOT NULL,
            util_p75 FLOAT NOT NULL,
            util_p95 FLOAT NOT NULL,
            clutch_mean FLOAT NOT NULL,
            clutch_stdev FLOAT NOT NULL,
            clutch_p50 FLOAT NOT NULL,
            clutch_p75 FLOAT NOT NULL,
            clutch_p95 FLOAT NOT NULL,
            created_at TIMESTAMP NOT NULL,
            locked BOOLEAN DEFAULT FALSE NOT NULL
        )');

        // Create indices for trace_calibration
        $this->addSql('CREATE UNIQUE INDEX idx_trace_calibration_version ON trace_calibration(version)');
        $this->addSql('CREATE INDEX idx_trace_calibration_created_at ON trace_calibration(created_at)');
    }

    public function down(Schema $schema): void
    {
        // Drop indices
        $this->addSql('DROP INDEX IF EXISTS idx_trace_rating_player_calculated_at');
        $this->addSql('DROP INDEX IF EXISTS idx_trace_rating_calibration_version');
        $this->addSql('DROP INDEX IF EXISTS idx_trace_rating_analysis_result_id');
        $this->addSql('DROP INDEX IF EXISTS idx_trace_calibration_created_at');
        $this->addSql('DROP INDEX IF EXISTS idx_trace_calibration_version');

        // Drop tables
        $this->addSql('DROP TABLE IF EXISTS trace_rating');
        $this->addSql('DROP TABLE IF EXISTS trace_calibration');
    }
}
