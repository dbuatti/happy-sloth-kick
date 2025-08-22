import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { PeopleMemory } from '@/types/task';

interface PersonAvatarProps {
  person: PeopleMemory;
  className?: string;
}

const PersonAvatar: React.FC<PersonAvatarProps> = ({ person, className }) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Avatar className={className}>
      <AvatarImage src={person.avatar_url || undefined} alt={person.name} />
      <AvatarFallback>
        {person.name ? getInitials(person.name) : <User className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  );
};

export default PersonAvatar;