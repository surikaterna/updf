export interface Font {
  width(text: any, size?: number): number;
}

export type Fof = { fof: number };

export type Widths = Fof & {
  [char: string]: number;
};

export type Kerning = Fof & {
  [prevChar: string]: {
    [char: string]: number;
  };
};

export type Spec = {
  widths: Widths;
  kerning: Kerning;
};
