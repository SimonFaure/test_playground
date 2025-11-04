use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
struct GameType {
    id: String,
    name: String,
    description: String,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Scenario {
    id: String,
    game_type_id: String,
    title: String,
    description: String,
    difficulty: String,
    duration_minutes: i32,
    created_at: String,
    image_url: Option<String>,
}

struct AppState {
    db: Mutex<Connection>,
}

fn init_database(conn: &Connection) -> SqliteResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS game_types (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS scenarios (
            id TEXT PRIMARY KEY,
            game_type_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            difficulty TEXT DEFAULT 'Medium',
            duration_minutes INTEGER DEFAULT 30,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            image_url TEXT,
            FOREIGN KEY (game_type_id) REFERENCES game_types(id)
        )",
        [],
    )?;

    seed_data(conn)?;

    Ok(())
}

fn seed_data(conn: &Connection) -> SqliteResult<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM game_types", [], |row| row.get(0))?;

    if count == 0 {
        conn.execute(
            "INSERT INTO game_types (id, name, description) VALUES
            ('1', 'Mystery', 'Immersive mystery adventures with puzzles and investigations'),
            ('2', 'TagQuest', 'Action-packed quest missions with tactical challenges')",
            [],
        )?;

        conn.execute(
            "INSERT INTO scenarios (id, game_type_id, title, description, difficulty, duration_minutes, image_url) VALUES
            ('1', '1', 'La Cuisine de Mamie Citrouille', 'A mysterious adventure in Grandma Pumpkin''s enchanted kitchen.', 'Medium', 30, 'https://images.pexels.com/photos/1121123/pexels-photo-1121123.jpeg'),
            ('2', '1', 'L''Académie des Sorciers', 'Enter the magical academy and uncover its secrets.', 'Medium', 35, 'https://images.pexels.com/photos/4473494/pexels-photo-4473494.jpeg'),
            ('3', '1', 'Le Portail des Ombres', 'Navigate through the mysterious shadow portal.', 'Hard', 40, 'https://images.pexels.com/photos/3617500/pexels-photo-3617500.jpeg'),
            ('4', '1', 'Bienvenue à Keyhouse', 'Unlock the secrets of the mysterious Keyhouse mansion.', 'Hard', 40, 'https://images.pexels.com/photos/1643389/pexels-photo-1643389.jpeg'),
            ('5', '1', 'L''Odyssée Spatiale', 'Embark on a thrilling space mystery adventure.', 'Medium', 35, 'https://images.pexels.com/photos/2166711/pexels-photo-2166711.jpeg'),
            ('6', '1', 'La Malédiction du Kraken', 'Solve the curse of the legendary sea monster.', 'Hard', 40, 'https://images.pexels.com/photos/3155726/pexels-photo-3155726.jpeg'),
            ('7', '1', 'Les Reliques de Toutankhamon', 'Discover the ancient Egyptian relics and their mysteries.', 'Hard', 45, 'https://images.pexels.com/photos/7740174/pexels-photo-7740174.jpeg'),
            ('8', '1', 'Potion Z', 'A fun mystery adventure perfect for children to create magical potions.', 'Easy', 25, 'https://images.pexels.com/photos/6646920/pexels-photo-6646920.jpeg'),
            ('9', '1', 'Monster Party', 'Join the monsters for a mysterious party full of surprises.', 'Easy', 25, 'https://images.pexels.com/photos/3297883/pexels-photo-3297883.jpeg'),
            ('10', '1', 'Mission Antidote', 'Race against time to find the cure and save everyone.', 'Medium', 30, 'https://images.pexels.com/photos/3825368/pexels-photo-3825368.jpeg'),
            ('11', '2', 'Bonbons en Folie', 'A sweet adventure quest to collect magical candies.', 'Easy', 25, 'https://images.pexels.com/photos/3081657/pexels-photo-3081657.jpeg'),
            ('12', '2', 'Monstropolis', 'Navigate through the monster city on an epic quest.', 'Medium', 30, 'https://images.pexels.com/photos/2291790/pexels-photo-2291790.jpeg'),
            ('13', '2', 'Les Aventuriers de l''Arche Sacrée', 'Search for the legendary sacred ark in this action quest.', 'Hard', 40, 'https://images.pexels.com/photos/1770809/pexels-photo-1770809.jpeg'),
            ('14', '2', 'Alchimiste: La Quête de l''Élixir', 'Become an alchemist and quest for the legendary elixir.', 'Medium', 35, 'https://images.pexels.com/photos/4021871/pexels-photo-4021871.jpeg'),
            ('15', '2', 'Le Safari des Animaux', 'Embark on an exciting animal safari quest adventure.', 'Easy', 25, 'https://images.pexels.com/photos/3551498/pexels-photo-3551498.jpeg'),
            ('16', '2', 'Stranger Day', 'Experience mysterious events in this thrilling quest.', 'Hard', 40, 'https://images.pexels.com/photos/1421903/pexels-photo-1421903.jpeg'),
            ('17', '2', 'L''École des Sorciers', 'Complete magical quests at the wizarding school.', 'Medium', 35, 'https://images.pexels.com/photos/159751/book-address-book-learning-learn-159751.jpeg'),
            ('18', '2', 'La Guerre des Trônes', 'Fight for the throne in this epic medieval quest.', 'Hard', 45, 'https://images.pexels.com/photos/2219118/pexels-photo-2219118.jpeg'),
            ('19', '2', 'Zombie Apocalypse', 'Survive the zombie outbreak in this intense quest for teens and adults.', 'Hard', 45, 'https://images.pexels.com/photos/2291791/pexels-photo-2291791.jpeg'),
            ('20', '2', 'Monster Kids Apocalypse', 'A kid-friendly monster adventure quest.', 'Medium', 30, 'https://images.pexels.com/photos/3297881/pexels-photo-3297881.jpeg')",
            [],
        )?;
    }

    Ok(())
}

#[tauri::command]
fn get_game_types(state: State<AppState>) -> Result<Vec<GameType>, String> {
    let conn = state.db.lock().unwrap();

    let mut stmt = conn
        .prepare("SELECT id, name, description, created_at FROM game_types ORDER BY name")
        .map_err(|e| e.to_string())?;

    let game_types = stmt
        .query_map([], |row| {
            Ok(GameType {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(game_types)
}

#[tauri::command]
fn get_scenarios(state: State<AppState>, game_type_id: Option<String>) -> Result<Vec<Scenario>, String> {
    let conn = state.db.lock().unwrap();

    let query = if game_type_id.is_some() {
        "SELECT id, game_type_id, title, description, difficulty, duration_minutes, created_at, image_url
         FROM scenarios WHERE game_type_id = ?1 ORDER BY title"
    } else {
        "SELECT id, game_type_id, title, description, difficulty, duration_minutes, created_at, image_url
         FROM scenarios ORDER BY title"
    };

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;

    let scenarios = if let Some(gtype_id) = game_type_id {
        stmt.query_map([gtype_id], |row| {
            Ok(Scenario {
                id: row.get(0)?,
                game_type_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                difficulty: row.get(4)?,
                duration_minutes: row.get(5)?,
                created_at: row.get(6)?,
                image_url: row.get(7)?,
            })
        })
    } else {
        stmt.query_map([], |row| {
            Ok(Scenario {
                id: row.get(0)?,
                game_type_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                difficulty: row.get(4)?,
                duration_minutes: row.get(5)?,
                created_at: row.get(6)?,
                image_url: row.get(7)?,
            })
        })
    }
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(scenarios)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_path = tauri::api::path::app_data_dir(&tauri::Config::default())
        .unwrap_or_else(|| std::env::current_dir().unwrap())
        .join("taghunter.db");

    let conn = Connection::open(db_path).expect("Failed to open database");
    init_database(&conn).expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            db: Mutex::new(conn),
        })
        .invoke_handler(tauri::generate_handler![
            get_game_types,
            get_scenarios
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
