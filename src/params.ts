export interface ParamMeta<Params = any> {
  [K: string]: {
    description?: string;
    required?: boolean;
    defaultValue?: any;
  };
}
