import type { Model, ModelKind, ModelResult, SolutionStep, XY } from './math/models/types';

export type Role = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  role: Role;
  display_name: string;
  username: string | null;
  email: string | null;
  onboarding_done: boolean;
  must_change_password: boolean;
  class: { id: string; name: string; teacher_name: string; survey_enabled: boolean } | null;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export type ModuleStatus = 'locked' | 'not_started' | 'in_progress' | 'completed';

export interface ModuleProgress {
  status: ModuleStatus;
  best_score: number;
  stars: number;
  last_segment_index: number;
}

export interface ModuleSummary {
  code: string;
  kind?: 'module' | 'practice';
  title: string;
  subtitle: string;
  order_index: number;
  minutes: number;
  question_count: number;
  progress: ModuleProgress;
}

export interface DisplayPoint {
  x: number;
  y: number;
  label?: string;
}

/** Lapisan gambar statis untuk kanvas (materi, petunjuk, solusi). */
export interface Display {
  points?: DisplayPoint[];
  arrows?: { from: XY; to: XY }[];
  lines?: { a: XY; b: XY }[];
  polygon?: XY[];
  hline?: number;
  vline?: number;
  quadrant?: Quadrant;
}

export type Quadrant = 'I' | 'II' | 'III' | 'IV';

export interface Interaction {
  type: 'tap_quadrant' | 'place_point';
  target?: Quadrant | { x: number; y: number };
  accept?: { x?: number; y?: number; not?: XY };
  line_from?: XY;
  success: string;
}

export interface Segment {
  kind: 'hook' | 'concept' | 'worked' | 'faded' | 'reflection';
  title: string;
  body: string;
  display?: Display;
  worked_steps?: { text: string; display?: Display }[];
  interaction?: Interaction;
}

export interface ModuleDetail {
  code: string;
  kind?: 'module' | 'practice';
  title: string;
  subtitle: string;
  minutes: number;
  objective_codes: string;
  question_count: number;
  segments: Segment[];
  progress: ModuleProgress | null;
}

export interface CanvasConfig {
  x_range?: [number, number];
  y_range?: [number, number];
  given_points?: DisplayPoint[];
  max_points?: number;
  /** Sembunyikan koordinat titik yang diberikan (soal membaca koordinat dari gambar). */
  hide_coords?: boolean;
}

export interface Literacy {
  process: 'formulate' | 'employ' | 'interpret';
  level: 'knowing' | 'applying' | 'reasoning';
  context: 'personal' | 'social' | 'scientific';
}

export interface Option {
  id: string;
  text: string;
}

export interface AnswerField {
  key: string;
  type: 'point' | 'number' | 'yesno';
  label: string;
  unit?: string;
}

export type QuestionType =
  | 'plot_point'
  | 'read_point'
  | 'relative_point'
  | 'draw_line'
  | 'multiple_choice'
  | 'numeric'
  | 'quadrant'
  | 'modeling';

export interface Question {
  id: string;
  slug: string;
  type: QuestionType;
  difficulty: 1 | 2 | 3;
  objective: string;
  stimulus_id: string | null;
  literacy: Literacy | null;
  prompt: string;
  highlights?: string[];
  canvas?: CanvasConfig;
  options?: Option[];
  reason_options?: Option[];
  unit?: string;
  hint_count?: number;
  // pemodelan
  tappables?: string[];
  known_mode?: 'auto' | 'tap' | 'self';
  prefill_tokens?: { known: string[]; asked: string[] };
  model_choices?: ModelKind[];
  model_prefill?: Partial<Model>;
  answer_fields?: AnswerField[];
  interpret_options?: Option[];
  check_question?: string;
  check_options?: Option[];
  step_hint_counts?: Record<StepName, number>;
}

export interface Stimulus {
  id: string;
  slug: string;
  title: string;
  context: string;
  description: string;
  scale?: { per_unit: number; unit: string };
  places: { label: string; x: number; y: number }[];
}

export interface AttemptResult {
  is_correct: boolean;
  score: number;
  partial?: boolean;
  attempt_number: number;
  misconception_code: string | null;
  feedback: string;
  explanation: string | null;
  correct_answer: Record<string, unknown> | null;
  /** Cara penyelesaian langkah demi langkah (setelah pembahasan dibuka). */
  solution_steps?: string[] | null;
  module_progress?: { status: ModuleStatus; best_score: number; stars: number };
}

export type StepName = 'understand' | 'formulate' | 'solve' | 'interpret' | 'check';

export interface StepState {
  tries: number;
  hints: number;
  done: boolean;
  score: number;
  revealed: boolean;
}

export interface ModelingState {
  current: StepName | 'done';
  steps: Record<StepName, StepState>;
  solution_viewed: boolean;
}

export interface StepResult {
  step: StepName;
  is_correct: boolean;
  score: number;
  max_score: number;
  feedback: string;
  misconception_code: string | null;
  model_text: string | null;
  tries: number;
  done: boolean;
  revealed: Record<string, unknown> | null;
  confirmed?: Record<string, unknown>;
  next_step: StepName | null;
  finished: boolean;
  state: ModelingState;
  total_score?: number;
  explanation?: string;
  module_progress?: { status: ModuleStatus; best_score: number; stars: number };
}

export interface Solution {
  steps: SolutionStep[];
  result: ModelResult;
  model_text: string;
}

export interface LiteracyProcess {
  process: 'formulate' | 'employ' | 'interpret';
  label: string;
  score: number | null;
  category: string | null;
}

export interface LiteracyProfile {
  processes: LiteracyProcess[];
  trend: { week: string; formulate: number | null; employ: number | null; interpret: number | null }[];
  suggestion: string | null;
}

export interface ClassInfo {
  id: string;
  name: string;
  join_code: string;
  sequential_unlock: boolean;
  survey_enabled: boolean;
  is_archived: boolean;
  student_count: number;
}

export interface SavedModel {
  id: string;
  title: string;
  model: Model;
  result: ModelResult;
}
