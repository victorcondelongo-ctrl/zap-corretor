import { MadeWithDyad } from "@/components/made-with-dyad";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { profile, loading, user } = useSession();

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (user && profile) {
      let dashboardLink = "/";
      let dashboardText = "Go to Dashboard";

      switch (profile.role) {
        case "SUPERADMIN":
          dashboardLink = "/superadmin/dashboard";
          dashboardText = "Go to Superadmin Dashboard";
          break;
        case "ADMIN_TENANT":
          dashboardLink = "/admin/dashboard";
          dashboardText = "Go to Admin Dashboard";
          break;
        case "AGENT":
          dashboardLink = "/agent/dashboard"; // Updated redirect path
          dashboardText = "Go to Agent Dashboard";
          break;
      }

      return (
        <>
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            Welcome back, {profile.full_name}!
          </h1>
          <p className="text-xl text-gray-600 mb-8 dark:text-gray-400">
            You are logged in as a {profile.role}.
          </p>
          <Link to={dashboardLink}>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              {dashboardText}
            </Button>
          </Link>
        </>
      );
    }

    // Default view for logged-out users
    return (
      <>
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">Welcome to ZapCorretor</h1>
        <p className="text-xl text-gray-600 mb-8 dark:text-gray-400">
          Start managing your leads here.
        </p>
        <Link to="/login">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
            Login
          </Button>
        </Link>
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        {renderContent()}
      </div>
      <div className="absolute bottom-0 w-full">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;