export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      game_types: {
        Row: {
          id: string
          name: string
          description: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string
          created_at?: string | null
        }
      }
      scenarios: {
        Row: {
          id: string
          game_type_id: string
          title: string
          description: string
          difficulty: string | null
          duration_minutes: number | null
          created_at: string | null
          image_url: string | null
        }
        Insert: {
          id?: string
          game_type_id: string
          title: string
          description: string
          difficulty?: string | null
          duration_minutes?: number | null
          created_at?: string | null
          image_url?: string | null
        }
        Update: {
          id?: string
          game_type_id?: string
          title?: string
          description?: string
          difficulty?: string | null
          duration_minutes?: number | null
          created_at?: string | null
          image_url?: string | null
        }
      }
    }
  }
}

export type GameType = Database['public']['Tables']['game_types']['Row'];
export type Scenario = Database['public']['Tables']['scenarios']['Row'];
