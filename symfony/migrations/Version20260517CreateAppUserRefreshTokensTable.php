<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260517CreateAppUserRefreshTokensTable extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create app_user_refresh_tokens table for token tracking (Phase 14 Wave 3)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE IF NOT EXISTS app_user (
            id UUID NOT NULL PRIMARY KEY,
            steam_id VARCHAR(20) NOT NULL,
            username VARCHAR(255) NOT NULL,
            avatar_url TEXT DEFAULT NULL,
            email VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            last_login_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL
        )');
        $this->addSql('CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_88BDF3E9F3FD4ECA ON app_user (steam_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS IDX_88BDF3E9F3FD4ECA ON app_user (steam_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS IDX_88BDF3E98B8E8428 ON app_user (created_at)');

        $this->addSql('CREATE TABLE IF NOT EXISTS app_user_refresh_tokens (
            id UUID NOT NULL PRIMARY KEY,
            user_id UUID NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            CONSTRAINT fk_app_user_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        )');

        // Create indexes
        $this->addSql('CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_AE97D07DB3BC57DA ON app_user_refresh_tokens (token_hash)');
        $this->addSql('CREATE INDEX IF NOT EXISTS IDX_AE97D07DA76ED395 ON app_user_refresh_tokens (user_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS IDX_AE97D07DF9D83E2 ON app_user_refresh_tokens (expires_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS app_user_refresh_tokens');
    }
}
