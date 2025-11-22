import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";

interface ChildFormData {
  fullName: string;
  gender: string;
  birthDate: string;
  prematureWeeks: number;
  guardianName: string;
  guardianPhone: string;
  note: string;
}

export default function ChildForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ChildFormData>({
    fullName: "",
    gender: "MALE",
    birthDate: "",
    prematureWeeks: 0,
    guardianName: "",
    guardianPhone: "",
    note: "",
  });

  useEffect(() => {
    if (id) {
      api.get(`/children/${id}`).then((res) => {
        const child = res.data;
        setFormData({
          fullName: child.fullName,
          gender: child.gender,
          birthDate: child.birthDate.split("T")[0],
          prematureWeeks: child.prematureWeeks,
          guardianName: child.guardianName || "",
          guardianPhone: child.guardianPhone || "",
          note: child.note || "",
        });
      });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (id) {
        await api.put(`/children/${id}`, formData);
      } else {
        await api.post("/children", formData);
      }
      navigate("/my-children");
    } catch (err) {
      alert("Failed to save child");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          {id ? "Edit Child Information" : "Add New Child"}
        </h1>
        <p className="text-gray-600">
          {id ? "Update child's information below" : "Enter your child's information to get started with ASQ-3 assessments"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border p-8 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            required
            placeholder="Enter child's full name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Gender *
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            >
              <option value="MALE">👦 Male</option>
              <option value="FEMALE">👧 Female</option>
              <option value="OTHER">👤 Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Birth Date *
            </label>
            <input
              type="date"
              required
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
        </div>

        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ⚠️ Premature Weeks (Optional)
          </label>
          <input
            type="number"
            min="0"
            max="20"
            placeholder="0"
            value={formData.prematureWeeks}
            onChange={(e) => setFormData({ ...formData, prematureWeeks: Number(e.target.value) })}
            className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
          />
          <div className="mt-3 p-3 bg-white rounded-lg">
            <p className="text-sm text-gray-700 font-medium mb-1">
              📌 Important for ASQ-3 Assessment
            </p>
            <p className="text-sm text-gray-600">
              If born premature (≥3 weeks early), enter weeks here. This adjusts the assessment age for accurate results.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Guardian Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter guardian's name"
              value={formData.guardianName}
              onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
              className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Guardian Phone (Optional)
            </label>
            <input
              type="tel"
              placeholder="Enter phone number"
              value={formData.guardianPhone}
              onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
              className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            rows={4}
            placeholder="Any additional information about the child..."
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Saving...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>✓</span>
                {id ? "Update Child" : "Add Child"}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-8 py-4 border-2 rounded-xl hover:bg-gray-50 transition font-semibold"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

