import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Frown } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-center p-4">
      <div className="bg-card p-8 rounded-xl shadow-lg max-w-md w-full space-y-6">
        <Frown className="h-24 w-24 text-primary mx-auto" />
        <h1 className="text-6xl font-extrabold text-foreground">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Oops! The page you're looking for doesn't exist.</p>
        <Button asChild size="lg" className="h-12 text-lg">
          <a href="/">Return to Home</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;