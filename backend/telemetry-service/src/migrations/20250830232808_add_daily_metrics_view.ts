import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS daily_device_metrics
    WITH (timescaledb.continuous) AS
    SELECT
      device_id,
      time_bucket('1 day', timestamp) as day,
      AVG(power_consumption) as avg_energy,
      MAX(power_consumption) as max_energy,
      MIN(power_consumption) as min_energy,
      SUM(power_consumption) as total_energy,
      COUNT(*) as readings_count
    FROM telemetry_data
    GROUP BY device_id, day;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS daily_device_metrics');
}

export const config = {
  transaction: false
};