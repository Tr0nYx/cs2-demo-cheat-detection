<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260517101200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create team and player_team tables for team leaderboards (Phase 12 Wave 4)';
    }

    public function up(Schema $schema): void
    {
        // Create team table
        $this->addSql(<<<'SQL'
            CREATE TABLE IF NOT EXISTS team (
                id UUID NOT NULL,
                name VARCHAR(255) NOT NULL,
                display_name VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                PRIMARY KEY (id)
            )
        SQL
        );
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_team_name ON team (name)');

        // Create player_team junction table (many-to-many)
        $this->addSql(<<<'SQL'
            CREATE TABLE IF NOT EXISTS player_team (
                team_id UUID NOT NULL,
                player_id UUID NOT NULL,
                PRIMARY KEY (team_id, player_id),
                CONSTRAINT fk_player_team_team FOREIGN KEY (team_id) REFERENCES team (id) ON DELETE CASCADE,
                CONSTRAINT fk_player_team_player FOREIGN KEY (player_id) REFERENCES player (id) ON DELETE CASCADE
            )
        SQL
        );
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS player_team');
        $this->addSql('DROP TABLE IF EXISTS team');
    }
}
