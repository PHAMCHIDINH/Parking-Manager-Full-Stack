import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        primary: {
            // Calm, professional blue
            main: '#2563eb',
            light: '#3b82f6',
            dark: '#1e40af',
            contrastText: '#ffffff',
        },
        secondary: {
            // Neutral gray for accents (less color noise)
            main: '#6b7280',
            light: '#9ca3af',
            dark: '#4b5563',
            contrastText: '#ffffff',
        },
        background: {
            default: '#f7f8fa',
            paper: '#ffffff',
        },
        text: {
            primary: '#111827',
            secondary: '#4b5563',
        },
        divider: '#e5e7eb',
    },
    typography: {
        fontFamily:
            "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'",
        button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: '#f7f8fa',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    border: '1px solid #eef0f3',
                },
            },
        },
        MuiButton: {
            defaultProps: { variant: 'contained' },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#f9fafb',
                    borderRight: '1px solid #eef0f3',
                    boxShadow: 'none',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#ffffff',
                    color: '#111827',
                    boxShadow: 'none',
                    borderBottom: '1px solid #eef0f3',
                },
            },
        },
    },
});
