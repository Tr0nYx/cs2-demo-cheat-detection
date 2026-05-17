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
                id BINARY(16) NOT NULL COMMENT '(DC2Type:uuid)',
                name VARCHAR(255) NOT NULL,
                display_name VARCHAR(255),
                created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                PRIMARY KEY (id),
                INDEX idx_team_name (name)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL
        );

        // Create player_team junction table (many-to-many)
        $this->addSql(<<<'SQL'
            CREATE TABLE IF NOT EXISTS player_team (
                player_id BINARY(16) NOT NULL COMMENT '(DC2Type:uuid)',
                team_id BINARY(16) NOT NULL COMMENT '(DC2Type:uuid)',
                PRIMARY KEY (player_id, team_id),
                INDEX idx_player_team_team_id (team_id),
                CONSTRAINT fk_player_team_player FOREIGN KEY (player_id) REFERENCES player (id) ON DELETE CASCADE,
                CONSTRAINT fk_player_team_team FOREIGN KEY (team_id) REFERENCES team (id) ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL
        );
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS player_team');
        $this->addSql('DROP TABLE IF EXISTS team');
    }
}
