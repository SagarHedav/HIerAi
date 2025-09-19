import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(),],
  daisyui: {
    themes: [
      {
        linkedin: {
					primary: "#0A66C2", // LinkedIn Blue
					secondary: "#FFFFFF", // White
					accent: "#7FC15E", // LinkedIn Green (for accents)
					neutral: "#000000", // Black (for text)
					"base-100": "#F3F2EF", // Light Gray (background)
					info: "#5E5E5E", // Dark Gray (for secondary text)
					success: "#057642", // Dark Green (for success messages)
					warning: "#F5C75D", // Yellow (for warnings)
					error: "#CC1016", // Red (for errors)
				},
  }]
  },
  
})
