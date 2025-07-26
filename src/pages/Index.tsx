import { MadeWithDyad } from "@/components/made-with-dyad";
import TaskList from "@/components/TaskList";
import Sidebar from "@/components/Sidebar"; // Import the Sidebar component

const Index = () => {
  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-grow flex items-center justify-center p-4">
          <TaskList />
        </main>
        <footer className="p-4">
          <MadeWithDyad />
        </footer>
      </div>
    </div>
  );
};

export default Index;