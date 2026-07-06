import { lazy, type LazyExoticComponent, type ComponentType } from "react";

export interface GameProps {
  onExit: () => void;
  onWin?: (payload: { caught: number; timeUsed: number }) => void;
  onLose?: (payload: { caught: number }) => void;
}

export interface GameRegistryItem {
  id: string;
  title: string;
  description: string;
  emoji: string;
  gradient: string;
  settingsKey: string; // key in app_settings holding this game's config JSON
  defaultEnabled: boolean;
  component: LazyExoticComponent<ComponentType<GameProps>>;
}

export const GAMES: GameRegistryItem[] = [
  {
    id: "haunted-house",
    title: "بيت الأشباح",
    description: "أمسك الأشباح قبل انتهاء الوقت",
    emoji: "👻",
    gradient: "from-purple-600 via-indigo-700 to-slate-900",
    settingsKey: "game_haunted_house",
    defaultEnabled: true,
    component: lazy(() => import("./HauntedHouse/HauntedHouseGame").then(m => ({ default: m.HauntedHouseGame }))),
  },
];

export interface HauntedHouseConfig {
  enabled: boolean;
  target_ghosts: number;
  duration_seconds: number;
  spawn_speed_multiplier: number;
  fake_ghosts_enabled: boolean;
  tutorial_enabled: boolean;
}

export const DEFAULT_HAUNTED_CONFIG: HauntedHouseConfig = {
  enabled: true,
  target_ghosts: 5,
  duration_seconds: 90,
  spawn_speed_multiplier: 1,
  fake_ghosts_enabled: true,
  tutorial_enabled: true,
};