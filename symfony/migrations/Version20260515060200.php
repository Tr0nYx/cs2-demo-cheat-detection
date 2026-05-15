<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260515060200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create demo, player, and analysis result tables for Phase 2.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE demo (id UUID NOT NULL, steam_match_id VARCHAR(64) DEFAULT NULL, original_filename VARCHAR(255) DEFAULT NULL, file_path VARCHAR(1024) NOT NULL, storage_disk VARCHAR(32) NOT NULL, status VARCHAR(24) NOT NULL, uploaded_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, processed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, error_message TEXT DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX idx_demo_status ON demo (status)');
        $this->addSql('CREATE INDEX idx_demo_uploaded_at ON demo (uploaded_at)');
        $this->addSql('CREATE TABLE player (id UUID NOT NULL, steam_id VARCHAR(64) NOT NULL, display_name VARCHAR(255) DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_player_steam_id ON player (steam_id)');
        $this->addSql('CREATE TABLE analysis_result (id UUID NOT NULL, demo_id UUID NOT NULL, player_id UUID NOT NULL, round_count INT NOT NULL, aimbot_score DOUBLE PRECISION NOT NULL, wallhack_score DOUBLE PRECISION NOT NULL, triggerbot_score DOUBLE PRECISION NOT NULL, recoil_score DOUBLE PRECISION NOT NULL, bhop_score DOUBLE PRECISION NOT NULL, session_consistency_score DOUBLE PRECISION NOT NULL, overall_suspicion DOUBLE PRECISION NOT NULL, suspicion_label VARCHAR(32) NOT NULL, feature_data JSON NOT NULL, support_data JSON NOT NULL, analyzed_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_analysis_result_demo_player ON analysis_result (demo_id, player_id)');
        $this->addSql('CREATE INDEX idx_analysis_result_analyzed_at ON analysis_result (analyzed_at)');
        $this->addSql('CREATE INDEX idx_analysis_result_player_analyzed_at ON analysis_result (player_id, analyzed_at)');
        $this->addSql('CREATE INDEX IDX_A8566F98214B61EA ON analysis_result (demo_id)');
        $this->addSql('CREATE INDEX IDX_A8566F9899E6F5DF ON analysis_result (player_id)');
        $this->addSql('ALTER TABLE analysis_result ADD CONSTRAINT FK_A8566F98214B61EA FOREIGN KEY (demo_id) REFERENCES demo (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE analysis_result ADD CONSTRAINT FK_A8566F9899E6F5DF FOREIGN KEY (player_id) REFERENCES player (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE analysis_result DROP CONSTRAINT FK_A8566F98214B61EA');
        $this->addSql('ALTER TABLE analysis_result DROP CONSTRAINT FK_A8566F9899E6F5DF');
        $this->addSql('DROP TABLE analysis_result');
        $this->addSql('DROP TABLE player');
        $this->addSql('DROP TABLE demo');
    }
}
