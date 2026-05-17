<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260517194029 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE demo ADD hltv_match_url VARCHAR(1024) DEFAULT NULL');
        $this->addSql('ALTER TABLE player ADD hltv_rating DOUBLE PRECISION DEFAULT NULL');
        $this->addSql('ALTER TABLE player ADD hltv_team VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE demo DROP hltv_match_url');
        $this->addSql('ALTER TABLE player DROP hltv_rating');
        $this->addSql('ALTER TABLE player DROP hltv_team');
    }
}
