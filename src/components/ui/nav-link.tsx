import React from 'react';
import { NavLink as RouterNavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  to: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

const NavLink = ({ to, icon: Icon, children }: NavLinkProps) => {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
          isActive && "bg-muted text-primary"
        )
      }
    >
      <Icon className="h-4 w-4" />
      {children}
    </RouterNavLink>
  );
};

export default NavLink;