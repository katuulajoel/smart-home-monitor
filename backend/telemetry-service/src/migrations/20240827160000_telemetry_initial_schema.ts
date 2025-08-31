import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create devices table
  await knex.schema.createTable('devices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('type').notNullable();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('metadata').defaultTo({});
    table.timestamps(true, true);
  });

  // Create telemetry_data hypertable
  await knex.schema.createTable('telemetry_data', (table) => {
    table.uuid('device_id').references('id').inTable('devices').onDelete('CASCADE');
    table.timestamp('timestamp', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.double('power_consumption');
    table.double('voltage');
    table.double('current');
    table.jsonb('additional_metrics');
    
    table.primary(['device_id', 'timestamp']);
  });

  // Create index for time-series queries
  await knex.raw('CREATE INDEX ON telemetry_data (device_id, timestamp DESC)');
  
  // Enable TimescaleDB extension and convert to hypertable
  await knex.raw('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');
  await knex.raw(
    "SELECT create_hypertable('telemetry_data', 'timestamp', if_not_exists => TRUE)"
  );
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('telemetry_data');
  await knex.schema.dropTableIfExists('devices');
  await knex.raw('DROP EXTENSION IF EXISTS timescaledb CASCADE');
}

export const config = {
  transaction: false
};
