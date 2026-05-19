<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260517CreateAppUserTable extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create app_user table for user persistence (Phase 14 Wave 3)';
    }

    public function up(Schema $schema): void
    {
        // Enable UUID extension
        $this->addSql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

        // Create app_user table
        $this->addSql('CREATE TABLE IF NOT EXISTS app_user (
            id UUID NOT NULL PRIMARY KEY,
            steam_id VARCHAR(20) NOT NULL,
            username VARCHAR(255) NOT NULL,
            avatar_url TEXT,
            email VARCHAR(255),
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            last_login_at TIMESTAMP(0) WITHOUT TIME ZONE
        )');

        // Create indexes
        $this->addSql('CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_88BDF3E9F3FD4ECA ON app_user (steam_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS IDX_88BDF3E9F3FD4ECA ON app_user (steam_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS IDX_88BDF3E98B8E8428 ON app_user (created_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS app_user');
    }
}
