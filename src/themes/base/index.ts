import { createTheme } from '@mantine/core';
import Button from './components/Button/Button';

export const theme = createTheme({
  fontFamily: 'Sour Gummy, monospace',
  headings: {
    fontFamily: 'Sour Gummy, monospace'
  },
  primaryColor: 'cyan',
  radius: {
    xs: '16px',
    sm: '32px',
    md: '42px',
    lg: '64px',
    xl: '92px',
  },
  components: {
    Button
  }
});
