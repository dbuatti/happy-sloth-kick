import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, BarChart3, Archive as ArchiveIcon, HelpCircle } from 'lucide-react';
import Settings from './Settings'; // Import new Settings page
import Analytics from './Analytics'; // Import new Analytics page
import Archive from './Archive'; // Import new Archive page
import Help from './Help'; // Import Help page

interface MyHubProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const MyHub: React.FC<MyHubProps> = ({ isDemo = false, demoUserId }) => {
  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center">My Hub</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs defaultValue="settings" className="w-full">
              <TabsList className="grid w-full grid-cols-4"> {/* Changed to grid-cols-4 */}
                <TabsTrigger value="settings">
                  <SettingsIcon className="h-4 w-4 mr-2" /> Settings
                </TabsTrigger>
                <TabsTrigger value="analytics">
                  <BarChart3 className="h-4 w-4 mr-2" /> Analytics
                </TabsTrigger>
                <TabsTrigger value="archive">
                  <ArchiveIcon className="h-4 w-4 mr-2" /> Archive
                </TabsTrigger>
                <TabsTrigger value="help"> {/* New Help Tab */}
                  <HelpCircle className="h-4 w-4 mr-2" /> Help
                </TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="mt-4">
                <Settings isDemo={isDemo} demoUserId={demoUserId} />
              </TabsContent>
              <TabsContent value="analytics" className="mt-4">
                <Analytics isDemo={isDemo} demoUserId={demoUserId} />
              </TabsContent>
              <TabsContent value="archive" className="mt-4">
                <Archive isDemo={isDemo} demoUserId={demoUserId} />
              </TabsContent>
              <TabsContent value="help" className="mt-4"> {/* New Help Content */}
                <Help />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MyHub;