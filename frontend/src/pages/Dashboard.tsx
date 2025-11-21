import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (hasRole("ADMIN")) {
      navigate("/admin");
    } else if (hasRole("SPECIALIST")) {
      navigate("/children");
    } else if (hasRole("PARENT")) {
      navigate("/my-children");
    }
  }, [hasRole, navigate]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Redirecting...</div>
    </div>
  );
}

