"use client";

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

function Index() {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <h1 className="text-4xl md:text-6xl font-bubbly text-primary mb-6 animate-fade-in-down">
        Welcome to Your Productivity Hub!
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground mb-8 text-center max-w-2xl animate-fade-in">
        Manage your tasks, track your projects, and optimize your well-being all in one place.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up">
        <Button asChild size="lg" className="shadow-lg hover:shadow-xl transition-all duration-300">
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="shadow-lg hover:shadow-xl transition-all duration-300">
          <Link to="/sleep-dashboard">Sleep Dashboard</Link> {/* New link */}
        </Button>
      </div>
    </div>
  );
}

export default Index;