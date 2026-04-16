import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Circle } from "lucide-react";

export const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);

    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative"
    >
      {/* Contrast icon - half-filled circle */}
      <Circle
        className="h-5 w-5"
        style={{
          fill: isDark ? "currentColor" : "transparent",
          clipPath: "polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)",
        }}
      />
      <Circle
        className="h-5 w-5 absolute"
        style={{
          fill: isDark ? "transparent" : "currentColor",
          clipPath: "polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)",
        }}
      />
    </Button>
  );
};
