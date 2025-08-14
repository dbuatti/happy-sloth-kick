import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettings, UserSettings } from '@/context/SettingsContext'; // Import UserSettings
import { pages } from '@/config/pages'; // Assuming pages config exists

interface PageToggleSettingsProps {
  settings: UserSettings | null;
  updateSettings: (updates: Partial<Omit<UserSettings, 'user_id'>>) => Promise<boolean>;
}

const PageToggleSettings: React.FC<PageToggleSettingsProps> = ({ settings, updateSettings }) => {
  const handleTogglePageVisibility = (path: string, checked: boolean) => {
    const newVisiblePages = {
      ...(settings?.visible_pages || {}), // Access visible_pages from settings
      [path]: checked,
    };
    updateSettings({ visible_pages: newVisiblePages }); // Correctly updates visible_pages
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Page Visibility</h3>
      <p className="text-sm text-muted-foreground">Control which pages are visible in the sidebar.</p>

      <div className="grid gap-4">
        {pages.map((page) => {
          if (!page.toggleable) return null; // Only show toggleable pages
          const Icon = page.icon;
          const isVisible = settings?.visible_pages?.[page.path] !== false; // Access visible_pages from settings
          return (
            <div key={page.path} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
                <Label htmlFor={`toggle-${page.path}`}>{page.name}</Label>
              </div>
              <Switch
                id={`toggle-${page.path}`}
                checked={isVisible}
                onCheckedChange={(checked) => handleTogglePageVisibility(page.path, checked)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PageToggleSettings;