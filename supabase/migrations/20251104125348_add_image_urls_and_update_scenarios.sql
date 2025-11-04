/*
  # Update Game Scenarios with Images

  ## Overview
  Updates the database schema and replaces sample data with real scenarios from Taghunter.fr

  ## Changes
  
  1. Schema Updates
    - Add `image_url` column to scenarios table for storing scenario images
  
  2. Data Updates
    - Remove sample data
    - Insert real Mystery scenarios from Taghunter.fr (10 scenarios)
    - Insert real Tagquest scenarios from Taghunter.fr (10 scenarios)
  
  ## Notes
  - All scenarios include authentic titles and image URLs from the official Taghunter website
  - Game types remain unchanged (Mystery and Tagquest)
*/

-- Add image_url column to scenarios table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scenarios' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE scenarios ADD COLUMN image_url text;
  END IF;
END $$;

-- Clear existing scenarios
DELETE FROM scenarios;

-- Insert Mystery scenarios
INSERT INTO scenarios (game_type_id, title, description, difficulty, duration_minutes, image_url)
SELECT 
  gt.id,
  scenario.title,
  scenario.description,
  scenario.difficulty,
  scenario.duration_minutes,
  scenario.image_url
FROM game_types gt
CROSS JOIN (
  VALUES
    ('LA CUISINE DE MAMIE CITROUILLE', 'Plongez dans l''univers magique de Mamie Citrouille', 'Medium', 45, 'https://taghunter.fr/wp-content/uploads/2025/09/mamie-citrouille-carre-300x300.png'),
    ('L''ACADÉMIE DES SORCIERS', 'Découvrez les mystères de l''académie des sorciers', 'Medium', 60, 'https://taghunter.fr/wp-content/uploads/2025/09/Academie-sorciers-carre-300x300.png'),
    ('LE PORTAIL DES OMBRES', 'Explorez le portail mystérieux vers un monde inconnu', 'Hard', 75, 'https://taghunter.fr/wp-content/uploads/2025/09/portail-ombres-carre-300x300.png'),
    ('BIENVENUE À KEYHOUSE', 'Découvrez les secrets de la maison aux clés magiques', 'Medium', 60, 'https://taghunter.fr/wp-content/uploads/2024/09/keyhouse-carre-300x300.png'),
    ('L''ODYSSÉE SPATIALE', 'Embarquez pour une aventure intergalactique palpitante', 'Hard', 90, 'https://taghunter.fr/wp-content/uploads/2024/09/Odyssee-carre-300x300.png'),
    ('LA MALÉDICTION DU KRAKEN', 'Affrontez la créature des profondeurs marines', 'Hard', 80, 'https://taghunter.fr/wp-content/uploads/2024/04/malediction-kraken-carre-300x300.png'),
    ('LES RELIQUES DE TOUTANKHAMON', 'Résolvez les énigmes de l''Égypte ancienne', 'Medium', 70, 'https://taghunter.fr/wp-content/uploads/2024/04/Reliques-toutankhamon-carre-300x300.png'),
    ('POTION Z POUR ENFANTS', 'Une aventure mystérieuse adaptée aux jeunes joueurs', 'Easy', 40, 'https://taghunter.fr/wp-content/uploads/2024/04/potion-z-carre-300x300.png'),
    ('MONSTER PARTY', 'Une fête monstrueuse pleine de surprises', 'Easy', 45, 'https://taghunter.fr/wp-content/uploads/2024/04/monster-party-carre-300x300.png')
) AS scenario(title, description, difficulty, duration_minutes, image_url)
WHERE gt.name = 'Mystery';

-- Insert Tagquest scenarios
INSERT INTO scenarios (game_type_id, title, description, difficulty, duration_minutes, image_url)
SELECT 
  gt.id,
  scenario.title,
  scenario.description,
  scenario.difficulty,
  scenario.duration_minutes,
  scenario.image_url
FROM game_types gt
CROSS JOIN (
  VALUES
    ('BONBONS EN FOLIE', 'Collectionnez un maximum de bonbons dans cette quête sucrée', 'Easy', 35, 'https://taghunter.fr/wp-content/uploads/2025/09/bonbons-en-folie-carre-300x300.png'),
    ('MONSTROPOLIS', 'Explorez la ville des monstres et accomplissez vos missions', 'Medium', 50, 'https://taghunter.fr/wp-content/uploads/2025/04/Monstropolis-carre-300x300.png'),
    ('LES AVENTURIERS DE L''ARCHE SACRÉE', 'Partez à la recherche de l''arche légendaire', 'Medium', 65, 'https://taghunter.fr/wp-content/uploads/2024/09/aventuriers-carre-300x300.png'),
    ('ALCHIMISTE : LA QUÊTE DE L''ELIXIR', 'Trouvez les ingrédients pour créer l''élixir magique', 'Hard', 70, 'https://taghunter.fr/wp-content/uploads/2024/09/alchimiste-carre-300x300.png'),
    ('LE SAFARI DES ANIMAUX', 'Observez et découvrez les animaux sauvages', 'Easy', 40, 'https://taghunter.fr/wp-content/uploads/2024/09/Safari-carre-300x300.png'),
    ('STRANGER DAY', 'Vivez une aventure inspirée de l''étrange et du mystérieux', 'Medium', 55, 'https://taghunter.fr/wp-content/uploads/2023/10/Stranger-day-carre-1-300x300.png'),
    ('L''ÉCOLE DES SORCIERS', 'Accomplissez vos missions à l''école de magie', 'Medium', 60, 'https://taghunter.fr/wp-content/uploads/2024/04/Ecole-des-Sorciers-carre-300x300.png'),
    ('LA GUERRE DES TRÔNES', 'Participez à la lutte pour le pouvoir suprême', 'Hard', 80, 'https://taghunter.fr/wp-content/uploads/2024/04/Guerre-des-Trones-Long-300x300.png'),
    ('ZOMBIE APOCALYPSE', 'Survivez dans un monde envahi par les zombies', 'Hard', 75, 'https://taghunter.fr/wp-content/uploads/2024/04/Zombie-Apo-carre-300x300.png')
) AS scenario(title, description, difficulty, duration_minutes, image_url)
WHERE gt.name = 'Tagquest';
