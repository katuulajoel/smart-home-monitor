import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  // TODO: Get an existing user or create a test user.
  // The email for the test user is currently hardcoded here.
  // Ideally, we should move this to an environment variable so that
  // other services that want to use this user for seeding data can
  // also use the same email.
  let user = await knex('users').where({email: 'test@example.com'}).first();

  if (!user) {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    // If no users exist, create a test user
    [user] = await knex('users')
      .insert({
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
  }

  // Deletes ALL existing entries
  await knex('telemetry_data').del();
  await knex('devices').del();

  // Inserts seed entries with the valid user_id
  const devices = await knex('devices').insert([
    {
      name: 'Living Room AC',
      type: 'air_conditioner',
      user_id: user.id,
      metadata: JSON.stringify({
        brand: 'Samsung',
        model: 'AR24F',
        location: 'Living Room',
        capacity: '2.5HP'
      })
    },
    {
      name: 'Refrigerator',
      type: 'refrigerator',
      user_id: user.id,
      metadata: JSON.stringify({
        brand: 'LG',
        model: 'GN-B435S',
        location: 'Kitchen',
        capacity: '400L'
      })
    },
    {
      name: 'Washing Machine',
      type: 'washing_machine',
      user_id: user.id,
      metadata: JSON.stringify({
        brand: 'Samsung',
        model: 'WW80T554DAN',
        location: 'Laundry Room',
        capacity: '8kg'
      })
    }
  ]).returning('id');

  // Generate sample telemetry data for each device
  const now = new Date();
  const telemetryData = [];

  for (const device of devices) {
    // Generate data for the last 7 days
    for (let i = 0; i < 7; i++) {
      const timestamp = new Date(now);
      timestamp.setDate(now.getDate() - i);
      
      // Generate 24 hours of data per day
      for (let h = 0; h < 24; h++) {
        const hourTimestamp = new Date(timestamp);
        hourTimestamp.setHours(h, 0, 0, 0);
        
        // Generate realistic power consumption values based on device type
        let powerConsumption: number;
        switch (device.type) {
          case 'air_conditioner':
            powerConsumption = 1500 + Math.random() * 1000; // 1.5kW - 2.5kW
            break;
          case 'refrigerator':
            powerConsumption = 100 + Math.random() * 50; // 100W - 150W
            break;
          case 'washing_machine':
            // Only add data when the machine is likely to be running
            if (h >= 8 && h <= 20 && i % 2 === 0) {
              powerConsumption = 500 + Math.random() * 500; // 500W - 1000W
            } else {
              powerConsumption = 5; // Standby power
            }
            break;
          default:
            powerConsumption = 100 + Math.random() * 50;
        }

        telemetryData.push({
          device_id: device.id,
          timestamp: hourTimestamp.toISOString(),
          power_consumption: Math.round(powerConsumption * 100) / 100, // Round to 2 decimal places
          voltage: 220 + (Math.random() * 20 - 10), // 210V - 230V
          current: powerConsumption / 220, // Calculate current from power and voltage
          additional_metrics: JSON.stringify({
            power_factor: 0.95 + (Math.random() * 0.1 - 0.05), // 0.9 - 1.0
            frequency: 49.8 + (Math.random() * 0.4) // 49.8Hz - 50.2Hz
          })
        });
      }
    }
  }

  // Insert telemetry data in batches to avoid hitting parameter limits
  const batchSize = 1000;
  for (let i = 0; i < telemetryData.length; i += batchSize) {
    const batch = telemetryData.slice(i, i + batchSize);
    await knex('telemetry_data').insert(batch);
  }

  // Refresh the materialized view to include the new data
  await knex.raw('REFRESH MATERIALIZED VIEW CONCURRENTLY daily_device_metrics');
}
