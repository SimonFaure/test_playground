export interface GameType {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Scenario {
  id: string;
  game_type_id: string;
  title: string;
  description: string;
  difficulty: string;
  duration_minutes: number;
  image_url: string;
  created_at: string;
}
