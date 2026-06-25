import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        colors: {
          primary:   '#1976D2',
          secondary: '#424242',
          success:   '#4CAF50',
          warning:   '#FF9800',
          error:     '#F44336',
          info:      '#2196F3',
        },
      },
      light: {
        colors: {
          primary:   '#1565C0',
          secondary: '#616161',
          success:   '#2E7D32',
          warning:   '#E65100',
          error:     '#C62828',
          info:      '#0277BD',
        },
      },
    },
  },
})
