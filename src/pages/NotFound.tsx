import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, Clock } from "lucide-react";

const stoicQuotes = [
  {
    quote: "You could leave life right now. Let that determine what you do and say and think.",
    author: "Marcus Aurelius",
    title: "Meditations"
  },
  {
    quote: "It is not that we have a short time to live, but that we waste a lot of it.",
    author: "Seneca",
    title: "On the Shortness of Life"
  },
  {
    quote: "Memento Mori - Remember that you must die.",
    author: "Ancient Stoic Principle",
    title: ""
  },
  {
    quote: "Think of yourself as dead. You have lived your life. Now take what's left and live it properly.",
    author: "Marcus Aurelius",
    title: "Meditations"
  },
  {
    quote: "We are more often frightened than hurt; and we suffer more in imagination than in reality.",
    author: "Seneca",
    title: "Letters from a Stoic"
  },
  {
    quote: "The whole future lies in uncertainty: live immediately.",
    author: "Seneca",
    title: "Letters from a Stoic"
  }
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [quote] = useState(() => stoicQuotes[Math.floor(Math.random() * stoicQuotes.length)]);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-2xl text-center space-y-8">
        {/* 404 with skull memento mori symbol */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <Clock className="h-16 w-16 text-muted-foreground opacity-50" />
            <h1 className="text-8xl font-bold text-muted-foreground/30">404</h1>
          </div>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
        </div>

        {/* Stoic quote */}
        <div className="space-y-4 py-8 border-y">
          <blockquote className="text-lg italic text-muted-foreground leading-relaxed">
            "{quote.quote}"
          </blockquote>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium">— {quote.author}</p>
            {quote.title && <p className="text-xs">{quote.title}</p>}
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Life is too short to spend it on pages that don't exist.
          </p>
          <p className="text-sm text-muted-foreground">
            The path you seek (<code className="text-xs bg-muted px-2 py-1 rounded">{location.pathname}</code>) leads nowhere.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 justify-center pt-4">
          <Button onClick={() => navigate("/")} size="lg">
            <Home className="mr-2 h-4 w-4" />
            Return Home
          </Button>
          <Button onClick={() => navigate(-1)} variant="outline" size="lg">
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
