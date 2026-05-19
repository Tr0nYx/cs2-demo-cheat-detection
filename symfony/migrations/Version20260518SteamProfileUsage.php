<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260518SteamProfileUsage extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add Steam profile, inventory, and market price snapshot tables for Phase 17';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE steam_profile_snapshot (
            id UUID NOT NULL,
            steam_id VARCHAR(64) NOT NULL,
            fetched_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            source VARCHAR(64) NOT NULL,
            visibility_state VARCHAR(32) NOT NULL,
            persona_name VARCHAR(255) DEFAULT NULL,
            avatar_url TEXT DEFAULT NULL,
            profile_url TEXT DEFAULT NULL,
            profile_state INT DEFAULT NULL,
            community_visibility_state INT DEFAULT NULL,
            time_created TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            last_logoff TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            raw_public_payload JSON NOT NULL,
            error_code VARCHAR(64) DEFAULT NULL,
            error_message TEXT DEFAULT NULL,
            PRIMARY KEY(id)
        )');
        $this->addSql('CREATE INDEX idx_steam_profile_snapshot_steam_fetched ON steam_profile_snapshot (steam_id, fetched_at)');
        $this->addSql('CREATE INDEX idx_steam_profile_snapshot_visibility ON steam_profile_snapshot (steam_id, visibility_state)');

        $this->addSql('CREATE TABLE steam_inventory_snapshot (
            id UUID NOT NULL,
            steam_id VARCHAR(64) NOT NULL,
            fetched_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            source VARCHAR(64) NOT NULL,
            visibility_state VARCHAR(32) NOT NULL,
            app_id INT NOT NULL,
            context_id VARCHAR(32) NOT NULL,
            item_count INT NOT NULL,
            tradable_count INT NOT NULL,
            marketable_count INT NOT NULL,
            estimated_value DOUBLE PRECISION DEFAULT NULL,
            estimated_currency VARCHAR(8) DEFAULT NULL,
            priced_item_count INT NOT NULL,
            unpriced_item_count INT NOT NULL,
            raw_public_payload JSON NOT NULL,
            error_code VARCHAR(64) DEFAULT NULL,
            error_message TEXT DEFAULT NULL,
            PRIMARY KEY(id)
        )');
        $this->addSql('CREATE INDEX idx_steam_inventory_snapshot_steam_fetched ON steam_inventory_snapshot (steam_id, fetched_at)');
        $this->addSql('CREATE INDEX idx_steam_inventory_snapshot_visibility ON steam_inventory_snapshot (steam_id, visibility_state)');

        $this->addSql('CREATE TABLE steam_market_price (
            id UUID NOT NULL,
            app_id INT NOT NULL,
            market_hash_name VARCHAR(512) NOT NULL,
            currency VARCHAR(8) NOT NULL,
            source VARCHAR(64) NOT NULL,
            price DOUBLE PRECISION DEFAULT NULL,
            volume INT DEFAULT NULL,
            fetched_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            expires_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            error_code VARCHAR(64) DEFAULT NULL,
            error_message TEXT DEFAULT NULL,
            PRIMARY KEY(id)
        )');
        $this->addSql('CREATE INDEX idx_steam_market_price_lookup ON steam_market_price (app_id, market_hash_name, currency, source)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS steam_market_price');
        $this->addSql('DROP TABLE IF EXISTS steam_inventory_snapshot');
        $this->addSql('DROP TABLE IF EXISTS steam_profile_snapshot');
    }
}
