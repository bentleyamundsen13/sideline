export type League = {
  id: string;
  name: string;
  sport: string;
  season: string | null;
  location: string | null;
  description: string | null;
  code: string;
  creator_id: string;
  created_at: string;
};

export type Team = {
  id: string;
  league_id: string;
  name: string;
  abbr: string;
  color: string;
  captain_id: string | null;
  created_at: string;
};

export type Member = {
  id: string;
  league_id: string;
  user_id: string;
  team_id: string | null;
  is_commissioner: boolean;
  onboarded: boolean;
  display_name: string;
  nickname: string | null;
  avatar_url: string | null;
  jersey_number: number | null;
  offense_position: string | null;
  defense_position: string | null;
  age: number | null;
  height_in: number | null;
  weight_lb: number | null;
  dominant_hand: "Right" | "Left" | "Both" | null;
  hometown: string | null;
  bio: string | null;
  joined_at: string;
};

export type Game = {
  id: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string;
  location: string | null;
  week: number | null;
  status: "scheduled" | "final";
  home_score: number | null;
  away_score: number | null;
  created_at: string;
};

export type StatLine = {
  id: string;
  league_id: string;
  member_id: string;
  game_id: string | null;
  played_on: string;
  touchdowns: number;
  interceptions: number;
  fumbles: number;
  receptions: number;
  drops: number;
  created_at: string;
} & Partial<PassingStats>;

/** QB numbers. Optional because rows from before the QB-stats migration lack them. */
export type PassingStats = {
  pass_completions: number;
  pass_attempts: number;
  pass_tds: number;
  ints_thrown: number;
};

export type StatTotals = {
  member_id: string;
  games: number;
  touchdowns: number;
  interceptions: number;
  fumbles: number;
  receptions: number;
  drops: number;
} & Partial<PassingStats>;

export type News = {
  id: string;
  league_id: string;
  author_id: string | null;
  kind: "announcement" | "transaction" | "result" | "system";
  title: string;
  body: string | null;
  created_at: string;
};

export type TradeStatus = "pending" | "accepted" | "declined" | "countered" | "cancelled";

export type Trade = {
  id: string;
  league_id: string;
  proposer_team_id: string;
  receiver_team_id: string;
  proposer_id: string | null;
  status: TradeStatus;
  message: string | null;
  parent_id: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type TradePlayer = {
  trade_id: string;
  member_id: string;
  from_team_id: string;
};

export type Notification = {
  id: string;
  user_id: string;
  league_id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type TeamRecord = {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: string | null;
  played: number;
};
