import {
  BedDouble, GraduationCap, HeartPulse, Landmark, Shield, Store, Trophy, Users, Utensils, Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "../types";

/**
 * Category styling. Map colours are muted, warm-leaning hues that sit well on the ivory UI and
 * the softened basemap, and stay distinguishable from each other and from the clay route colour.
 */
export const CATEGORY: Record<Category, { label: string; color: string; Icon: LucideIcon }> = {
  academic: { label: "Academic", color: "#5876A8", Icon: GraduationCap },
  administrative: { label: "Administrative", color: "#8467A8", Icon: Landmark },
  "student-services": { label: "Student services", color: "#3A8A80", Icon: Users },
  health: { label: "Health", color: "#B9524B", Icon: HeartPulse },
  food: { label: "Food", color: "#C98A3A", Icon: Utensils },
  sports: { label: "Sports", color: "#5E8F4E", Icon: Trophy },
  residential: { label: "Residential", color: "#946A4E", Icon: BedDouble },
  utility: { label: "Utility", color: "#87847A", Icon: Wrench },
  security: { label: "Security", color: "#5B6672", Icon: Shield },
  commercial: { label: "Shops & stalls", color: "#B8733F", Icon: Store },
};

export const UNIDENTIFIED_COLOR = "#A19F96";

/** Ground surfaces for open areas, so a lawn looks like grass and a court like a court. */
export const SURFACE: Record<string, { fill: string; stroke: string; opacity: number }> = {
  grass: { fill: "#8DB86B", stroke: "#5E8F4E", opacity: 0.55 },
  court: { fill: "#6FA79B", stroke: "#3F7D72", opacity: 0.5 },
  paved: { fill: "#C8C3B5", stroke: "#8F897A", opacity: 0.5 },
};
