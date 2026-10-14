import { createContext } from "react";

export const DepartmentNavigation = createContext<null | { show: (type: string) => boolean }>(null);
