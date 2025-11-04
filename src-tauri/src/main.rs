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
            ('1', 'Laser Tag', 'Fast-paced team combat with laser equipment'),
            ('2', 'Airsoft', 'Tactical gameplay with airsoft guns and realistic scenarios')",
            [],
        )?;

        conn.execute(
            "INSERT INTO scenarios (id, game_type_id, title, description, difficulty, duration_minutes, image_url) VALUES
            ('1', '1', 'Team Deathmatch', 'Classic team vs team combat. Eliminate the enemy team to win.', 'Easy', 15, 'https://images.pexels.com/photos/7195279/pexels-photo-7195279.jpeg'),
            ('2', '1', 'Capture the Flag', 'Infiltrate enemy territory and capture their flag while defending yours.', 'Medium', 20, 'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg'),
            ('3', '1', 'Domination', 'Control strategic points on the map to accumulate points.', 'Medium', 25, 'https://images.pexels.com/photos/6334069/pexels-photo-6334069.jpeg'),
            ('4', '1', 'VIP Escort', 'One team protects a VIP while the other team tries to eliminate them.', 'Hard', 20, 'https://images.pexels.com/photos/7195265/pexels-photo-7195265.jpeg'),
            ('5', '1', 'Infection', 'Survivors vs infected. Tagged players join the infected team.', 'Easy', 15, 'https://images.pexels.com/photos/7195334/pexels-photo-7195334.jpeg'),
            ('6', '2', 'Search and Destroy', 'Attackers plant a bomb while defenders try to prevent it.', 'Hard', 30, 'https://images.pexels.com/photos/8728555/pexels-photo-8728555.jpeg'),
            ('7', '2', 'Hostage Rescue', 'Special forces must rescue hostages from enemy territory.', 'Hard', 35, 'https://images.pexels.com/photos/8728380/pexels-photo-8728380.jpeg'),
            ('8', '2', 'Milsim Operation', 'Military simulation with realistic tactics and communication.', 'Hard', 60, 'https://images.pexels.com/photos/1670732/pexels-photo-1670732.jpeg'),
            ('9', '2', 'King of the Hill', 'Teams fight to control a central position on the battlefield.', 'Medium', 25, 'https://images.pexels.com/photos/8728398/pexels-photo-8728398.jpeg')",
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
