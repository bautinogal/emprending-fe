import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import './index.css'
import App from './App.tsx'

const main = { r: 215, g: 130, b: 50 };
const light = { r: 222, g: 154, b: 81 };
const dark = { r: 228, g: 177, b: 122 };

const theme = createTheme({
  palette: {
    primary: {
      dark: `rgb(${dark.r}, ${dark.g}, ${dark.b})`,
      main: `rgb(${main.r}, ${main.g}, ${main.b})`,
      light: `rgb(${light.r}, ${light.g}, ${light.b})`,
      contrastText: '#ffffff',
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
