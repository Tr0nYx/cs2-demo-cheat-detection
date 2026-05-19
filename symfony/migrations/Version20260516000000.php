<?php
declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260516000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create sharecode_imports table for multi-platform demo import tracking';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
CREATE TABLE sharecode_imports (
    id UUID NOT NULL,
    sharecode VARCHAR(24) NOT NULL,
    platform VARCHAR(32) NOT NULL,
    user_id UUID NOT NULL,
    status VARCHAR(24) NOT NULL,
    imported_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    completed_at TIMESTAMP(0) WITHOUT TIME ZONE,
    error_message TEXT,
    demo_id UUID,
    attempt_count INTEGER NOT NULL,
    PRIMARY KEY(id)
);
SQL);

        $this->addSql('CREATE UNIQUE INDEX uniq_sharecode ON sharecode_imports (sharecode)');
        $this->addSql('CREATE INDEX idx_sharecode_imports_user_id ON sharecode_imports (user_id)');
        $this->addSql('CREATE INDEX idx_sharecode_imports_status ON sharecode_imports (status)');
        $this->addSql('CREATE INDEX idx_sharecode_imports_platform ON sharecode_imports (platform)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE sharecode_imports');
    }
}
