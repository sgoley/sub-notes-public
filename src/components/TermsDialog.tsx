import { Link } from "react-router-dom";

export function TermsDialog() {
  return (
    <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
      <Link
        to="/terms"
        className="hover:text-foreground transition-colors"
      >
        Terms of Service
      </Link>
      <span>•</span>
      <Link
        to="/privacy"
        className="hover:text-foreground transition-colors"
      >
        Privacy Policy
      </Link>
    </div>
  );
}
