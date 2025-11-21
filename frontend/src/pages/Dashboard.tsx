import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user, hasRole } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Welcome, {user?.username}!</h1>
      <p className="text-gray-600 mb-8">
        Role: <span className="font-medium">{user?.role}</span>
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {hasRole("PARENT") && (
          <Link
            to="/my-children"
            className="block p-6 bg-white rounded-lg border hover:shadow-lg transition"
          >
            <h2 className="text-xl font-semibold mb-2">My Children</h2>
            <p className="text-gray-600 text-sm">
              View and manage your children's information
            </p>
          </Link>
        )}

        {hasRole(["SPECIALIST", "ADMIN"]) && (
          <Link
            to="/children"
            className="block p-6 bg-white rounded-lg border hover:shadow-lg transition"
          >
            <h2 className="text-xl font-semibold mb-2">All Children</h2>
            <p className="text-gray-600 text-sm">
              View all children in the system
            </p>
          </Link>
        )}

        <Link
          to="/questionnaires"
          className="block p-6 bg-white rounded-lg border hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">Questionnaires</h2>
          <p className="text-gray-600 text-sm">
            Browse available ASQ-3 questionnaires
          </p>
        </Link>

        {hasRole("ADMIN") && (
          <Link
            to="/users"
            className="block p-6 bg-white rounded-lg border hover:shadow-lg transition"
          >
            <h2 className="text-xl font-semibold mb-2">User Management</h2>
            <p className="text-gray-600 text-sm">
              Manage system users and roles
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}

