import { MadeWithDyad } from "@/components/made-with-dyad";
import TaskList from "@/components/TaskList"; // Import the new TaskList component

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="flex-grow flex items-center justify-center w-full">
        <TaskList />
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;