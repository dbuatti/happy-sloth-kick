import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MindfulnessToolCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  link: string;
}

const MindfulnessToolCard: React.FC<MindfulnessToolCardProps> = ({ title, description, icon: Icon, link }) => {
  return (
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-200 flex flex-col">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Icon className="h-6 w-6 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <p className="text-muted-foreground text-sm mb-4">{description}</p>
        <Button asChild className="w-full h-9">
          <Link to={link}>
            Explore <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default MindfulnessToolCard;