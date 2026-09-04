/**
 * Style reminder — The Marginalia Room: global shell stays quiet so the homepage can carry the editorial rhythm; preserve direct navigation to the archive and Ask the Archive.
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;
  return <WouterRouter base={basePath}><Switch><Route path="/" component={Home} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></WouterRouter>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
