export type Theme = {
  bg: string; text: string; card: string; border: string;
};

export type Colors = {
  ATB: { primary: string; dark: string };
  YR:  { primary: string; light: string };
  NRK: { primary: string; dark: string };
  CLUBS?: Record<string, string>;
};
