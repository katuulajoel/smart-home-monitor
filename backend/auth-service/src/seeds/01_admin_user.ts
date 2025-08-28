import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('users').del();

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  // Inserts seed entries
  await knex('users').insert([
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Test User',
      email: 'user@example.com',
      password: hashedPassword,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // Do not log credentials in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n🔑 Test user created: user@example.com, password123\n');
  }
}

// Required by Knex
export const _meta = {
  version: 1,
};
