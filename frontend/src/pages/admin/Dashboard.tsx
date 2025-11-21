import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

interface Stats {
  users: number;
  children: number;
  assessments: number;
  questionnaires: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ users: 0, children: 0, assessments: 0, questionnaires: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/users"),
      api.get("/children"),
      api.get("/assessments"),
      api.get("/questionnaires"),
    ]).then(([users, children, assessments, questionnaires]) => {
      setStats({
        users: users.data.length,
        children: children.data.length,
        assessments: assessments.data.length,
        questionnaires: questionnaires.data.length,
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-white rounded-lg border">
          <p className="text-sm text-gray-600 mb-1">Total Users</p>
          <p className="text-3xl font-bold text-gray-900">{stats.users}</p>
        </div>
        <div className="p-6 bg-white rounded-lg border">
          <p className="text-sm text-gray-600 mb-1">Total Children</p>
          <p className="text-3xl font-bold text-gray-900">{stats.children}</p>
        </div>
        <div className="p-6 bg-white rounded-lg border">
          <p className="text-sm text-gray-600 mb-1">Total Assessments</p>
          <p className="text-3xl font-bold text-gray-900">{stats.assessments}</p>
        </div>
        <div className="p-6 bg-white rounded-lg border">
          <p className="text-sm text-gray-600 mb-1">Questionnaires</p>
          <p className="text-3xl font-bold text-gray-900">{stats.questionnaires}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Link to="/admin/users" className="p-8 bg-white rounded-lg border hover:shadow-lg transition">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-4xl">👥</span>
            <h2 className="text-2xl font-semibold">User Management</h2>
          </div>
          <p className="text-gray-600">Manage system users, roles, and permissions</p>
        </Link>

        <Link to="/admin/children" className="p-8 bg-white rounded-lg border hover:shadow-lg transition">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-4xl">👶</span>
            <h2 className="text-2xl font-semibold">Children Records</h2>
          </div>
          <p className="text-gray-600">View and manage all children in the system</p>
        </Link>

        <Link to="/admin/questionnaires" className="p-8 bg-white rounded-lg border hover:shadow-lg transition">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-4xl">📋</span>
            <h2 className="text-2xl font-semibold">Questionnaires</h2>
          </div>
          <p className="text-gray-600">Manage ASQ-3 questionnaires and versions</p>
        </Link>

        <div className="p-8 bg-white rounded-lg border opacity-50">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-4xl">⚙️</span>
            <h2 className="text-2xl font-semibold">System Settings</h2>
          </div>
          <p className="text-gray-600">Coming soon...</p>
        </div>
      </div>
    </div>
  );
}

