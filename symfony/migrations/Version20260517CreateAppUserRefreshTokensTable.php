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
        $this->addSql('CREATE TABLE IF NOT EXISTS app_user_refresh_tokens (
            id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            token_hash VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_app_user_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        )');

        // Create indexes
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_app_user_refresh_tokens_user_id ON app_user_refresh_tokens (user_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_app_user_refresh_tokens_expires_at ON app_user_refresh_tokens (expires_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS app_user_refresh_tokens');
    }
}
