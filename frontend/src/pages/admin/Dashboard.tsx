import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

interface Stats {
  users: number;
  children: number;
  assessments: number;
  questionnaires: number;
}

interface RecentActivity {
  id: number;
  fullName: string;
  gender?: string;
  createdAt: string;
}

interface User {
  id: number;
  username: string;
  role: string;
  lastLoginAt: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ users: 0, children: 0, assessments: 0, questionnaires: 0 });
  const [recentChildren, setRecentChildren] = useState<RecentActivity[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
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
      setRecentChildren(children.data.slice(0, 5));
      setRecentUsers(users.data.slice(-3).reverse());
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  const growth = {
    users: "+12%",
    children: "+8%",
    assessments: "+24%",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your system.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Last updated</p>
          <p className="text-sm font-medium text-gray-900">{new Date().toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">👥</span>
              <span className="px-3 py-1 bg-white bg-opacity-20 text-xs font-bold rounded-full">
                {growth.users}
              </span>
            </div>
            <p className="text-4xl font-bold mb-1">{stats.users}</p>
            <p className="text-blue-100 text-sm">Total Users</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">👶</span>
              <span className="px-3 py-1 bg-white bg-opacity-20 text-xs font-bold rounded-full">
                {growth.children}
              </span>
            </div>
            <p className="text-4xl font-bold mb-1">{stats.children}</p>
            <p className="text-green-100 text-sm">Children Records</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">✅</span>
              <span className="px-3 py-1 bg-white bg-opacity-20 text-xs font-bold rounded-full">
                {growth.assessments}
              </span>
            </div>
            <p className="text-4xl font-bold mb-1">{stats.assessments}</p>
            <p className="text-purple-100 text-sm">Assessments</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">📋</span>
              <span className="px-3 py-1 bg-white bg-opacity-20 text-xs font-bold rounded-full">
                Active
              </span>
            </div>
            <p className="text-4xl font-bold mb-1">{stats.questionnaires}</p>
            <p className="text-orange-100 text-sm">Questionnaires</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/admin/users"
                className="group flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  👥
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 group-hover:text-blue-600">User Management</p>
                  <p className="text-sm text-gray-600">Manage users & roles</p>
                </div>
                <span className="text-gray-400 group-hover:text-blue-600">→</span>
              </Link>

              <Link
                to="/admin/children"
                className="group flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all"
              >
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  👶
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 group-hover:text-green-600">Children Records</p>
                  <p className="text-sm text-gray-600">View all children</p>
                </div>
                <span className="text-gray-400 group-hover:text-green-600">→</span>
              </Link>

              <Link
                to="/admin/questionnaires"
                className="group flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  📋
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 group-hover:text-orange-600">Questionnaires</p>
                  <p className="text-sm text-gray-600">Manage ASQ-3 forms</p>
                </div>
                <span className="text-gray-400 group-hover:text-orange-600">→</span>
              </Link>

              <Link
                to="/admin/assessments"
                className="group flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  ✅
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 group-hover:text-purple-600">Assessments</p>
                  <p className="text-sm text-gray-600">View all results</p>
                </div>
                <span className="text-gray-400 group-hover:text-purple-600">→</span>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Children</h2>
              <Link to="/admin/children" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {recentChildren.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-2xl mb-2">👶</p>
                  <p className="text-sm">No children yet</p>
                </div>
              ) : (
                recentChildren.map((child) => (
                  <Link
                    key={child.id}
                    to={`/children/${child.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 border transition group"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-xl text-white">
                      {child.gender === "MALE" ? "👦" : child.gender === "FEMALE" ? "👧" : "👤"}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{child.fullName}</p>
                      <p className="text-sm text-gray-500">
                        Added {new Date(child.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-gray-400 group-hover:text-gray-600">→</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Users</h2>
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center font-bold text-gray-700">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.username}</p>
                    <p className="text-xs text-gray-500">{user.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <p className="text-sm text-purple-100 mb-2">This Month</p>
            <p className="text-4xl font-bold mb-1">{stats.assessments}</p>
            <p className="text-purple-100">Total Assessments</p>
            <p className="text-xs text-purple-200 mt-4">↗ 24% from last month</p>
          </div>
        </div>
      </div>
    </div>
  );
}

