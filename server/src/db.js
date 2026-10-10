import mysql from "mysql2/promise";

// Create a temporary connection pool (without database) for initial setup
let pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Initialize database schema if needed
export async function initializeDatabase() {
  try {
    console.log("🔧 Connecting to MySQL...");
    
    // First, create the database if it doesn't exist
    let connection = await pool.getConnection();
    
    try {
      await connection.execute(
        `CREATE DATABASE IF NOT EXISTS \`${process.env.MYSQL_DATABASE}\``
      );
      console.log(`✅ Database '${process.env.MYSQL_DATABASE}' created/verified`);
    } finally {
      connection.release();
    }

    // Close the temporary pool and create a new one with the database selected
    await pool.end();
    
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log("✅ Connection pool initialized with database");

    // Get a connection from the database pool
    connection = await pool.getConnection();

    try {
      // Create tables if they don't exist
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS players (
          id VARCHAR(36) PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          passwordHash VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          credits BIGINT DEFAULT 0,
          \`rank\` VARCHAR(100),
          level INT DEFAULT 1,
          guild VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS player_stats (
          id INT AUTO_INCREMENT PRIMARY KEY,
          player_id VARCHAR(36) NOT NULL,
          attack INT DEFAULT 0,
          defense INT DEFAULT 0,
          shield INT DEFAULT 0,
          cargo INT DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
          UNIQUE KEY unique_player_stats (player_id)
        )
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS reports (
          id INT AUTO_INCREMENT PRIMARY KEY,
          player_id VARCHAR(36),
          report_type VARCHAR(100) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          status ENUM('pending', 'generated', 'sent', 'failed') DEFAULT 'pending',
          pdf_path VARCHAR(255),
          email_sent_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL
        )
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS combat_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          player_id VARCHAR(36) NOT NULL,
          opponent_id VARCHAR(36),
          outcome VARCHAR(50),
          damage_dealt INT,
          damage_taken INT,
          event_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
        )
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS economy_events (
          id INT AUTO_INCREMENT PRIMARY KEY,
          player_id VARCHAR(36) NOT NULL,
          resource_type VARCHAR(100),
          amount BIGINT,
          event_type VARCHAR(100),
          event_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
        )
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS ship_classes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          class_name VARCHAR(100) NOT NULL UNIQUE,
          base_attack INT DEFAULT 100,
          base_defense INT DEFAULT 80,
          base_shield INT DEFAULT 150,
          base_cargo INT DEFAULT 5000,
          base_hp INT DEFAULT 1000,
          build_cost BIGINT DEFAULT 50000,
          build_time_minutes INT DEFAULT 60,
          crew_capacity INT DEFAULT 50,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS ships (
          id VARCHAR(36) PRIMARY KEY,
          player_id VARCHAR(36) NOT NULL,
          class_id INT,
          name VARCHAR(255) NOT NULL,
          status ENUM('docked', 'idle', 'moving', 'combat', 'patrol', 'damaged') DEFAULT 'docked',
          location_x FLOAT DEFAULT 0,
          location_y FLOAT DEFAULT 0,
          location_name VARCHAR(255),
          hp INT DEFAULT 1000,
          hp_max INT DEFAULT 1000,
          shield INT DEFAULT 150,
          shield_max INT DEFAULT 150,
          attack INT DEFAULT 100,
          defense INT DEFAULT 80,
          cargo_capacity INT DEFAULT 5000,
          cargo_used INT DEFAULT 0,
          crew_count INT DEFAULT 50,
          armor_level INT DEFAULT 1,
          shielding_level INT DEFAULT 1,
          destination_x FLOAT,
          destination_y FLOAT,
          destination_name VARCHAR(255),
          travel_progress INT DEFAULT 0,
          travel_total_distance INT DEFAULT 0,
          current_target_ship_id VARCHAR(36),
          current_target_player_id VARCHAR(36),
          last_combat_time TIMESTAMP NULL,
          built_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
          FOREIGN KEY (class_id) REFERENCES ship_classes(id),
          INDEX idx_player (player_id),
          INDEX idx_status (status),
          INDEX idx_location (location_x, location_y)
        )
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS fleets (
          id VARCHAR(36) PRIMARY KEY,
          player_id VARCHAR(36) NOT NULL,
          fleet_name VARCHAR(255) NOT NULL,
          formation ENUM('line', 'wedge', 'sphere', 'loose') DEFAULT 'line',
          total_attack INT DEFAULT 0,
          total_defense INT DEFAULT 0,
          total_shield INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
          UNIQUE KEY unique_player_fleet (player_id, fleet_name)
        )
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS fleet_ships (
          id INT AUTO_INCREMENT PRIMARY KEY,
          fleet_id VARCHAR(36) NOT NULL,
          ship_id VARCHAR(36) NOT NULL,
          fleet_position INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (fleet_id) REFERENCES fleets(id) ON DELETE CASCADE,
          FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE,
          UNIQUE KEY unique_fleet_ship (fleet_id, ship_id)
        )
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS fleet_movements (
          id INT AUTO_INCREMENT PRIMARY KEY,
          player_id VARCHAR(36) NOT NULL,
          fleet_id VARCHAR(36),
          ship_id VARCHAR(36),
          destination_x FLOAT,
          destination_y FLOAT,
          destination_name VARCHAR(255),
          distance INT,
          speed INT DEFAULT 10,
          estimated_arrival TIMESTAMP,
          status ENUM('queued', 'moving', 'arrived', 'cancelled') DEFAULT 'queued',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
          FOREIGN KEY (fleet_id) REFERENCES fleets(id) ON DELETE SET NULL,
          FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE SET NULL
        )
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS nearby_players (
          id INT AUTO_INCREMENT PRIMARY KEY,
          scanner_player_id VARCHAR(36) NOT NULL,
          detected_player_id VARCHAR(36) NOT NULL,
          detected_player_name VARCHAR(255),
          distance FLOAT,
          ship_count INT,
          threat_level ENUM('low', 'medium', 'high', 'extreme') DEFAULT 'medium',
          last_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (scanner_player_id) REFERENCES players(id) ON DELETE CASCADE,
          FOREIGN KEY (detected_player_id) REFERENCES players(id) ON DELETE CASCADE,
          INDEX idx_scanner (scanner_player_id),
          UNIQUE KEY unique_detection (scanner_player_id, detected_player_id)
        )
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS pvp_engagements (
          id INT AUTO_INCREMENT PRIMARY KEY,
          attacker_player_id VARCHAR(36) NOT NULL,
          attacker_fleet_id VARCHAR(36),
          defender_player_id VARCHAR(36) NOT NULL,
          defender_fleet_id VARCHAR(36),
          status ENUM('initiated', 'active', 'attacker_won', 'defender_won', 'mutual_retreat') DEFAULT 'active',
          battle_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          battle_end TIMESTAMP NULL,
          attacker_ships_remaining INT,
          defender_ships_remaining INT,
          attacker_casualties INT,
          defender_casualties INT,
          attacker_rewards BIGINT DEFAULT 0,
          defender_rewards BIGINT DEFAULT 0,
          battle_log TEXT,
          FOREIGN KEY (attacker_player_id) REFERENCES players(id) ON DELETE CASCADE,
          FOREIGN KEY (defender_player_id) REFERENCES players(id) ON DELETE CASCADE,
          FOREIGN KEY (attacker_fleet_id) REFERENCES fleets(id) ON DELETE SET NULL,
          FOREIGN KEY (defender_fleet_id) REFERENCES fleets(id) ON DELETE SET NULL,
          INDEX idx_players (attacker_player_id, defender_player_id)
        )
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS ship_upgrades (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ship_id VARCHAR(36) NOT NULL,
          upgrade_type ENUM('armor', 'shield', 'engine', 'weapons', 'cargo') DEFAULT 'armor',
          upgrade_level INT DEFAULT 1,
          cost_credits BIGINT,
          installation_complete TIMESTAMP,
          FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE
        )
      `);

      // Seed ship classes
      await connection.execute(`
        INSERT IGNORE INTO ship_classes (class_name, base_attack, base_defense, base_shield, base_cargo, base_hp, build_cost, build_time_minutes, crew_capacity)
        VALUES
        ('Fighter', 120, 60, 80, 1000, 500, 25000, 30, 20),
        ('Destroyer', 200, 100, 150, 3000, 1200, 60000, 90, 60),
        ('Cruiser', 150, 120, 200, 5000, 1500, 80000, 120, 80),
        ('Battleship', 300, 180, 400, 8000, 2500, 150000, 240, 150),
        ('Carrier', 80, 140, 300, 15000, 1800, 200000, 300, 200),
        ('Scout', 60, 40, 60, 2000, 300, 15000, 20, 10),
        ('Interceptor', 140, 70, 100, 1500, 600, 35000, 45, 25),
        ('Dreadnought', 400, 220, 500, 12000, 3500, 300000, 480, 250)
      `);

      console.log("✅ Database schema initialized successfully");
      console.log("✅ Ship classes seeded");
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("❌ Error initializing database:", error.message);
    throw error;
  }
}

// Helper function to execute queries
export async function executeQuery(sql, values = []) {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(sql, values);
    return results;
  } finally {
    connection.release();
  }
}

export { pool };
