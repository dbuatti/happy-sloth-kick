import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSettings } from '@/context/SettingsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutDashboard } from 'lucide-react'; // Keep LayoutDashboard for the card title icon
import { navItemsConfig } from '@/config/navItems'; // Import the new config

const PageToggleSettings: React.FC = () => {
  const { settings, loading, updateSettings } = useSettings();

  // Filter navItemsConfig to get only toggleable pages
  const toggleablePages = navItemsConfig.filter(item => item.toggleable);

  const handleToggle = (path: string, checked: boolean) => {
    const newVisiblePages = {
      ...(settings?.visible_pages || {}),
      [path]: checked,
    };
    updateSettings({ visible_pages: newVisiblePages });
  };

  if (loading) {
    return (
      <Card className="w-full shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" /> Page Visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-primary" /> Page Visibility
        </CardTitle>
        <p className="text-sm text-muted-foreground">Choose which tools to show in your sidebar.</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {toggleablePages.map(page => {
            const Icon = page.icon;
            const isVisible = settings?.visible_pages?.[page.path] !== false;
            return (
              <div key={page.path} className="flex items-center justify-between">
                <Label htmlFor={`toggle-${page.path}`} className="text-base font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {page.name}
                </Label>
                <Switch
                  id={`toggle-${page.path}`}
                  checked={isVisible}
                  onCheckedChange={(checked) => handleToggle(page.path, checked)}
                  aria-label={`Toggle visibility for ${page.name}`}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PageToggleSettings;