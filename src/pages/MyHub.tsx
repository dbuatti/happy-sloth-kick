import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, BarChart3, Archive as ArchiveIcon } from 'lucide-react';
import Settings from './Settings'; // Import new Settings page
import Analytics from './Analytics'; // Import new Analytics page
import Archive from './Archive'; // Import new Archive page

const MyHub: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center">My Hub</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs defaultValue="settings" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="settings">
                  <SettingsIcon className="h-4 w-4 mr-2" /> Settings
                </TabsTrigger>
                <TabsTrigger value="analytics">
                  <BarChart3 className="h-4 w-4 mr-2" /> Analytics
                </TabsTrigger>
                <TabsTrigger value="archive">
                  <ArchiveIcon className="h-4 w-4 mr-2" /> Archive
                </TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="mt-4">
                <Settings />
              </TabsContent>
              <TabsContent value="analytics" className="mt-4">
                <Analytics />
              </TabsContent>
              <TabsContent value="archive" className="mt-4">
                <Archive />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default MyHub;