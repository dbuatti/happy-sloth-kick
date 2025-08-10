import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, BookOpen } from 'lucide-react';

const resources = [
  {
    title: "Sleep Health Foundation",
    description: "Explore a wide range of articles and fact sheets to help you learn more about sleep and how to improve it.",
    link: "https://www.sleephealthfoundation.org.au/all-healthy-sleep",
  },
  {
    title: "This Way Up Insomnia Program",
    description: "Learn effective, step-by-step strategies for managing chronic sleep difficulties with this practical and free online program.",
    link: "https://thiswayup.org.au/programs/insomnia-program/",
  },
];

const SleepResources: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Sleep Health Resources</h2>
        <p className="text-muted-foreground">
          Explore these external resources to learn more about improving your sleep.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {resources.map((resource, index) => (
          <Card key={index} className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {resource.title}
              </CardTitle>
              <CardDescription>{resource.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
              <Button asChild className="w-full">
                <a href={resource.link} target="_blank" rel="noopener noreferrer">
                  Visit Website <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SleepResources;