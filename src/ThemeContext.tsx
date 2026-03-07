import { createContext, useContext } from 'react';

export type Theme = 'modern' | 'classic';

export const ThemeContext = createContext<Theme>('modern');

export const useTheme = () => useContext(ThemeContext);
