import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        primary: {
            main: '#283593',
            light: '#5c6bc0',
            dark: '#1a237e',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#ff6f00',
            light: '#ffa040',
            dark: '#c43e00',
            contrastText: '#ffffff',
        },
        background: {
            default: '#f0f2f5',
            paper: '#ffffff',
        },
        text: {
            primary: '#212121',
            secondary: '#424242',
        },
    },
    components: {
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#f5f7fa',
                    border: 'none',
                    boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.15)',
                },
            },
        },
    },
});
