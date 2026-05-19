<?php
declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260518FixSharecodeLength extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Widen sharecode_imports.sharecode column from 24 to 34 chars to match actual CS2 sharecode length';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE sharecode_imports ALTER COLUMN sharecode TYPE VARCHAR(34)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE sharecode_imports ALTER COLUMN sharecode TYPE VARCHAR(24)');
    }
}
