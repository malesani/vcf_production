import { useState, useEffect } from "react";
import type { SelectData } from "./GeneralForm_Common";

export type DependentConfig<T> = {
  field: keyof T;
  dependencies: Array<keyof T>;
  getOptions: (data: T) => SelectData[];
};

export function useDependentOptions<T>(
  formData: T,
  configs: DependentConfig<T>[]
): Record<keyof T, SelectData[]> {
  const [map, setMap] = useState<Record<keyof T, SelectData[]>>(
    () =>
      configs.reduce((acc, c) => {
        acc[c.field] = c.getOptions(formData);
        return acc;
      }, {} as Record<keyof T, SelectData[]>)
  );

  useEffect(() => {
    setMap(
      configs.reduce((acc, c) => {
        acc[c.field] = c.getOptions(formData);
        return acc;
      }, {} as Record<keyof T, SelectData[]>)
    );
  }, [formData, configs]);

  return map;
}