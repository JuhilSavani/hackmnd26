import { ThemeProvider } from "@/utils/contexts/ThemeProvider"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div>App</div>
    </ThemeProvider>
  )
}

export default App