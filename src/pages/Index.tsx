import { MadeWithDyad } from "@/components/made-with-dyad";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">Welcome to ZapCorretor</h1>
        <p className="text-xl text-gray-600 mb-8 dark:text-gray-400">
          Start managing your leads here.
        </p>
        <Link to="/admin/leads">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
            Go to Admin Leads Dashboard
          </Button>
        </Link>
      </div>
      <div className="absolute bottom-0 w-full">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;