const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'arayanvar',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('Database bağlantı testi başarılı:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database bağlantı hatası:', error);
    throw error;
  }
};

const createTables = async () => {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      surname VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      is_verified BOOLEAN DEFAULT FALSE,
      subscription_end_date DATE,
      birthday DATE,
      gender VARCHAR(20),
      city VARCHAR(100),
      profile_image_url TEXT,
      instagram_url VARCHAR(255),
      facebook_url VARCHAR(255),
      linkedin_url VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createSectionsTable = `
    CREATE TABLE IF NOT EXISTS sections (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      image TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createBrandsTable = `
    CREATE TABLE IF NOT EXISTS brands (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
      image TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createProductsTable = `
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
      model VARCHAR(255),
      description TEXT,
      image TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const addSocialMediaColumns = `
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='instagram_url') THEN
        ALTER TABLE users ADD COLUMN instagram_url VARCHAR(255);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='facebook_url') THEN
        ALTER TABLE users ADD COLUMN facebook_url VARCHAR(255);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='whatsappurl') THEN
        ALTER TABLE users ADD COLUMN whatsappurl VARCHAR(255);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='linkedin_url') THEN
        ALTER TABLE users ADD COLUMN linkedin_url VARCHAR(255);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='about') THEN
        ALTER TABLE users ADD COLUMN about TEXT;
      END IF;
    END $$;
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
    CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
    CREATE INDEX IF NOT EXISTS idx_brands_category ON brands(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
  `;

  try {
    await pool.query(createUsersTable);
    await pool.query(createSectionsTable);
    await pool.query(createBrandsTable);
    await pool.query(createProductsTable);
    await pool.query(addSocialMediaColumns);
    await pool.query(createIndexes);
    console.log('✅ Veritabanı tabloları oluşturuldu');
  } catch (error) {
    console.error('❌ Tablo oluşturma hatası:', error);
    throw error;
  }
};

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed:', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error:', { text, error: error.message });
    throw error;
  }
};

const getClient = async () => {
  return await pool.connect();
};

module.exports = {
  query,
  getClient,
  testConnection,
  createTables,
  pool
};