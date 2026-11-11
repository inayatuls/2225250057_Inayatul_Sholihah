export type ModelKind =
  | 'translate'
  | 'route_chain'
  | 'axis_distance'
  | 'relative_position'
  | 'axis_line'
  | 'rect_shape'
  | 'right_triangle'
  | 'point_pattern'
  | 'composite';

export type Dir = 'utara' | 'selatan' | 'timur' | 'barat' | 'atas' | 'bawah' | 'kanan' | 'kiri';

export interface MPoint {
  x: number;
  y: number;
  label?: string;
}

export interface Scale {
  per_unit: number;
  unit: string;
}

export interface Move {
  dir: Dir | '';
  n: number;
}

/** Bentuk model longgar: field yang relevan tergantung `kind`. */
export interface Model {
  kind: ModelKind;
  start?: MPoint;
  moves?: Move[];
  a?: MPoint;
  b?: MPoint;
  c?: MPoint;
  through?: MPoint;
  parallel_to?: 'x' | 'y';
  from?: MPoint | null;
  first?: MPoint;
  step?: { dx: number; dy: number };
  n?: number;
  boundary?: { axis: 'x' | 'y'; max?: number | null; min?: number | null } | null;
  scale?: Scale | null;
  parts?: unknown[];
}

export interface Quantity {
  units: number;
  real?: number;
  unit?: string;
}

export interface ModelResult {
  final_position?: [number, number];
  travel_distance?: Quantity;
  distance?: Quantity;
  dx?: number;
  dy?: number;
  description?: string;
  equation?: string;
  nearest?: [number, number];
  missing?: [number, number];
  length?: Quantity;
  width?: Quantity;
  area?: Quantity;
  perimeter?: Quantity;
  base?: Quantity;
  height?: Quantity;
  point?: [number, number];
  inside?: boolean;
}

export type XY = [number, number];

export interface CanvasInstr {
  point?: XY;
  points?: XY[];
  arrow?: [XY, XY];
  polygon?: XY[];
  hline?: number;
  vline?: number;
}

export interface SolutionStep {
  text: string;
  expr: string;
  canvas?: CanvasInstr;
}

export interface SolveOutput {
  result: ModelResult;
  steps: SolutionStep[];
}
