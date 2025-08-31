import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable required extensions
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // Create chat_messages table
  await knex.schema.createTable('chat_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('user_id').notNullable();
    table.string('session_id').notNullable();
    table.enum('role', ['user', 'assistant', 'system']).notNullable();
    table.text('content').notNullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    // Indexes
    table.index('user_id', 'idx_chat_messages_user_id');
    table.index('session_id', 'idx_chat_messages_session_id');
    table.index('created_at', 'idx_chat_messages_created_at');
  });

  // Add GIN index for full-text search on content
  await knex.schema.raw(
    `CREATE INDEX idx_chat_messages_content_gin ON chat_messages USING GIN (to_tsvector('english', content))`
  );

  // Add GIN index for JSONB metadata
  await knex.schema.raw(
    'CREATE INDEX idx_chat_messages_metadata_gin ON chat_messages USING GIN (metadata)'
  );

  // Add trigram index for LIKE/ILIKE queries
  await knex.schema.raw(
    'CREATE INDEX idx_chat_messages_content_trgm ON chat_messages USING GIN (content gin_trgm_ops)'
  );
}

export async function down(knex: Knex): Promise<void> {
  // Drop indexes first
  await knex.schema.raw('DROP INDEX IF EXISTS idx_chat_messages_content_gin');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_chat_messages_metadata_gin');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_chat_messages_content_trgm');
  
  // Drop tables
  await knex.schema.dropTableIfExists('chat_messages');
  
  // Drop extensions
  await knex.raw('DROP EXTENSION IF EXISTS "pgcrypto"');
  await knex.raw('DROP EXTENSION IF EXISTS "pg_trgm"');
  await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
}

// Required by Knex
export const _meta = {
  version: 1,
};
