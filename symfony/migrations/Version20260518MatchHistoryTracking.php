<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260518MatchHistoryTracking extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add Steam match-history tracking connections';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE steam_match_history_connection (
            id UUID NOT NULL,
            user_id UUID NOT NULL,
            steam_id VARCHAR(32) NOT NULL,
            encrypted_steam_id_key TEXT DEFAULT NULL,
            credential_fingerprint VARCHAR(96) DEFAULT NULL,
            seed_sharecode VARCHAR(34) NOT NULL,
            known_sharecode VARCHAR(34) NOT NULL,
            status VARCHAR(32) NOT NULL,
            connected_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            disconnected_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            last_check_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            next_check_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            last_error_code VARCHAR(64) DEFAULT NULL,
            last_error_message TEXT DEFAULT NULL,
            consecutive_failures INT NOT NULL DEFAULT 0,
            discovered_count INT NOT NULL DEFAULT 0,
            queued_count INT NOT NULL DEFAULT 0,
            imported_count INT NOT NULL DEFAULT 0,
            PRIMARY KEY(id)
        )');
        $this->addSql('CREATE INDEX idx_match_history_user ON steam_match_history_connection (user_id)');
        $this->addSql('CREATE INDEX idx_match_history_steam ON steam_match_history_connection (steam_id)');
        $this->addSql('CREATE INDEX idx_match_history_status ON steam_match_history_connection (status)');
        $this->addSql('CREATE INDEX idx_match_history_next_check ON steam_match_history_connection (next_check_at)');
        $this->addSql("CREATE UNIQUE INDEX uniq_match_history_active_user_steam ON steam_match_history_connection (user_id, steam_id) WHERE status <> 'disconnected'");
        $this->addSql('ALTER TABLE steam_match_history_connection ADD CONSTRAINT fk_match_history_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS steam_match_history_connection');
    }
}
